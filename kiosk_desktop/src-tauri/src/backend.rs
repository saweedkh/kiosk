//! Spawn bundled Django backend next to the app EXE and wait until /health/ is ready.

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};

use crate::config::AppConfig;
use crate::logutil;

pub struct BackendHandle {
    child: Mutex<Child>,
    /// Windows job with KILL_ON_JOB_CLOSE: backend dies if kiosk.exe exits or crashes.
    #[cfg(windows)]
    _job: Option<WinJob>,
}

impl BackendHandle {
    fn kill_child(&self) {
        if let Ok(mut child) = self.child.lock() {
            let pid = child.id();
            logutil::info(&format!("stopping backend pid={pid}"));
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

/// Kill the Django sidecar when the window / app closes.
pub fn stop(app: &AppHandle) {
    if let Some(state) = app.try_state::<BackendHandle>() {
        state.kill_child();
    }
}

#[cfg(target_os = "windows")]
pub fn show_fatal(msg: &str) {
    logutil::error(&format!("FATAL: {msg}"));
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr::null_mut;

    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(
            hwnd: *mut core::ffi::c_void,
            text: *const u16,
            caption: *const u16,
            flags: u32,
        ) -> i32;
    }

    fn wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(Some(0)).collect()
    }

    let full = format!("{msg}\n\n{}", logutil::open_logs_hint());
    let text = wide(&full);
    let caption = wide("Kiosk");
    unsafe {
        MessageBoxW(null_mut(), text.as_ptr(), caption.as_ptr(), 0x10);
    }
}

#[cfg(not(target_os = "windows"))]
pub fn show_fatal(msg: &str) {
    logutil::error(&format!("FATAL: {msg}"));
    eprintln!("Kiosk fatal: {msg}\n{}", logutil::open_logs_hint());
}

pub fn start(app: &AppHandle) -> Result<(), String> {
    let config = AppConfig::from_env();
    let log_dir = logutil::logs_dir();

    // If Django is already serving (operator ran kiosk-backend.exe), reuse it.
    // Do not taskkill / spawn / own the process — closing kiosk.exe must leave it up.
    if probe_health_with_timeout(&config, Duration::from_millis(800)) {
        logutil::info(&format!(
            "backend already healthy at {} — skipping sidecar spawn",
            health_url(&config)
        ));
        return Ok(());
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    logutil::info(&format!(
        "exe_dir={:?} data_dir={} log_dir={} api={}:{}",
        logutil::exe_dir(),
        data_dir.display(),
        log_dir.display(),
        config.api_host,
        config.api_port
    ));

    // Previous kiosk.exe may have left an orphan sidecar on the API port.
    kill_stale_backend_processes();

    let spawned = spawn_backend(&config, &data_dir, &log_dir)?;
    app.manage(BackendHandle {
        child: Mutex::new(spawned.child),
        #[cfg(windows)]
        _job: spawned.job,
    });
    // Health wait runs in a background thread (see lib.rs) so boot.html can show.
    Ok(())
}

/// Block until `/health/` returns 200 or the deadline expires.
pub fn wait_until_ready() -> Result<(), String> {
    let config = AppConfig::from_env();
    wait_for_health(&config)?;
    logutil::info(&format!(
        "Django ready http://{}:{}/ (bound {})",
        if config.api_host == "0.0.0.0" {
            "127.0.0.1"
        } else {
            config.api_host.as_str()
        },
        config.api_port,
        config.api_host
    ));
    Ok(())
}

fn find_backend_binary() -> Result<PathBuf, String> {
    let dir = logutil::exe_dir().ok_or_else(|| "cannot resolve kiosk.exe directory".to_string())?;
    let names = [
        "kiosk-backend-x86_64-pc-windows-msvc.exe",
        "kiosk-backend.exe",
        "kiosk-backend-aarch64-pc-windows-msvc.exe",
        "kiosk-backend-x86_64-unknown-linux-gnu",
        "kiosk-backend-aarch64-apple-darwin",
        "kiosk-backend-x86_64-apple-darwin",
    ];
    for name in names {
        let path = dir.join(name);
        if path.is_file() {
            return Ok(path);
        }
    }

    let cwd = std::env::current_dir().unwrap_or_else(|_| dir.clone());
    let main_py = cwd.join("kiosk_backend").join("main.py");
    if main_py.is_file() {
        return Ok(main_py);
    }

    Err(format!(
        "Backend EXE not found next to kiosk.exe.\n\n\
         Folder: {}\n\n\
         Put one of these files beside kiosk.exe:\n\
         - kiosk-backend-x86_64-pc-windows-msvc.exe\n\
         - kiosk-backend.exe\n\n\
         {}",
        dir.display(),
        logutil::open_logs_hint()
    ))
}

struct SpawnedBackend {
    child: Child,
    #[cfg(windows)]
    job: Option<WinJob>,
}

fn spawn_backend(config: &AppConfig, data_dir: &Path, log_dir: &Path) -> Result<SpawnedBackend, String> {
    let path = find_backend_binary()?;
    logutil::info(&format!("starting backend {}", path.display()));

    let mut cmd = if path.extension().and_then(|e| e.to_str()) == Some("py") {
        let mut c = Command::new(if cfg!(windows) { "python" } else { "python3" });
        c.arg(&path);
        if let Some(parent) = path.parent().and_then(|p| p.parent()) {
            c.current_dir(parent);
        }
        c
    } else {
        let mut c = Command::new(&path);
        if let Some(dir) = path.parent() {
            c.current_dir(dir);
        }
        c
    };

    cmd.env("KIOSK_DATA_DIR", data_dir)
        .env("KIOSK_LOG_DIR", log_dir)
        .env("KIOSK_API_HOST", &config.api_host)
        .env("KIOSK_API_PORT", config.api_port.to_string())
        .env("DJANGO_SETTINGS_MODULE", "config.settings.desktop")
        .env("PAYMENT_GATEWAY_NAME", &config.payment_gateway)
        .env("POS_TCP_HOST", &config.pos_host)
        .env("POS_TCP_PORT", config.pos_port.to_string())
        .env("SEED_DEMO_DATA", "1")
        .env("KIOSK_QUIET_STARTUP", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start backend {}: {e}", path.display()))?;

    if let Some(out) = child.stdout.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().flatten() {
                logutil::django_line("stdout", &line);
                tracing::info!(target: "django", "{line}");
            }
        });
    }
    if let Some(err) = child.stderr.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().flatten() {
                logutil::django_line("stderr", &line);
                tracing::warn!(target: "django", "{line}");
            }
        });
    }

    #[cfg(windows)]
    let job = unsafe { winjob::create() };
    #[cfg(windows)]
    {
        if let Some(ref job) = job {
            if !unsafe { winjob::assign(&child, job) } {
                logutil::error("could not assign backend to Windows job (crash may orphan it)");
            }
        }
    }

    Ok(SpawnedBackend {
        child,
        #[cfg(windows)]
        job,
    })
}

fn kill_stale_backend_processes() {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        for name in [
            "kiosk-backend-x86_64-pc-windows-msvc.exe",
            "kiosk-backend.exe",
        ] {
            let _ = Command::new("taskkill")
                .args(["/F", "/IM", name, "/T"])
                .creation_flags(CREATE_NO_WINDOW)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status();
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}

#[cfg(windows)]
struct WinJob {
    handle: *mut core::ffi::c_void,
}

#[cfg(windows)]
unsafe impl Send for WinJob {}
#[cfg(windows)]
unsafe impl Sync for WinJob {}

#[cfg(windows)]
impl Drop for WinJob {
    fn drop(&mut self) {
        if !self.handle.is_null() {
            unsafe {
                winjob::CloseHandle(self.handle);
            }
            self.handle = std::ptr::null_mut();
        }
    }
}

#[cfg(windows)]
mod winjob {
    use super::WinJob;
    use std::process::Child;
    use std::ptr::null_mut;

    #[link(name = "kernel32")]
    extern "system" {
        fn CreateJobObjectW(attrs: *mut core::ffi::c_void, name: *const u16) -> *mut core::ffi::c_void;
        fn SetInformationJobObject(
            job: *mut core::ffi::c_void,
            info_class: i32,
            info: *mut core::ffi::c_void,
            len: u32,
        ) -> i32;
        fn AssignProcessToJobObject(
            job: *mut core::ffi::c_void,
            process: *mut core::ffi::c_void,
        ) -> i32;
        pub fn CloseHandle(handle: *mut core::ffi::c_void) -> i32;
    }

    const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION: i32 = 9;
    const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: u32 = 0x2000;

    #[repr(C)]
    struct JobObjectBasicLimitInformation {
        per_process_user_time_limit: i64,
        per_job_user_time_limit: i64,
        limit_flags: u32,
        minimum_working_set_size: usize,
        maximum_working_set_size: usize,
        active_process_limit: u32,
        affinity: usize,
        priority_class: u32,
        scheduling_class: u32,
    }

    #[repr(C)]
    struct IoCounters {
        read_operation_count: u64,
        write_operation_count: u64,
        other_operation_count: u64,
        read_transfer_count: u64,
        write_transfer_count: u64,
        other_transfer_count: u64,
    }

    #[repr(C)]
    struct JobObjectExtendedLimitInformation {
        basic: JobObjectBasicLimitInformation,
        io: IoCounters,
        process_memory_limit: usize,
        job_memory_limit: usize,
        peak_process_memory_used: usize,
        peak_job_memory_used: usize,
    }

    pub unsafe fn create() -> Option<WinJob> {
        let handle = CreateJobObjectW(null_mut(), null_mut());
        if handle.is_null() {
            return None;
        }
        let mut info: JobObjectExtendedLimitInformation = std::mem::zeroed();
        info.basic.limit_flags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let ok = SetInformationJobObject(
            handle,
            JOB_OBJECT_EXTENDED_LIMIT_INFORMATION,
            &mut info as *mut _ as *mut core::ffi::c_void,
            std::mem::size_of::<JobObjectExtendedLimitInformation>() as u32,
        );
        if ok == 0 {
            CloseHandle(handle);
            return None;
        }
        Some(WinJob { handle })
    }

    pub unsafe fn assign(child: &Child, job: &WinJob) -> bool {
        use std::os::windows::io::AsRawHandle;
        AssignProcessToJobObject(job.handle, child.as_raw_handle() as *mut core::ffi::c_void) != 0
    }
}

fn health_url(config: &AppConfig) -> String {
    // Binding 0.0.0.0 is for listen; health probes must hit loopback.
    let probe_host = if config.api_host == "0.0.0.0" {
        "127.0.0.1"
    } else {
        config.api_host.as_str()
    };
    format!("http://{}:{}/health/", probe_host, config.api_port)
}

pub fn probe_health(config: &AppConfig) -> bool {
    probe_health_with_timeout(config, Duration::from_secs(2))
}

fn probe_health_with_timeout(config: &AppConfig, timeout: Duration) -> bool {
    ureq::get(&health_url(config))
        .timeout(timeout)
        .call()
        .map(|r| r.status() == 200)
        .unwrap_or(false)
}

fn wait_for_health(config: &AppConfig) -> Result<(), String> {
    let url = health_url(config);
    logutil::info(&format!(
        "waiting for {url} (listen {}:{}, up to 3 min for first migrate)",
        config.api_host, config.api_port
    ));
    let deadline = Instant::now() + Duration::from_secs(180);
    let mut attempts = 0u32;

    while Instant::now() < deadline {
        attempts += 1;
        if probe_health(config) {
            logutil::info(&format!("health OK after {attempts} attempts"));
            return Ok(());
        }
        if attempts % 10 == 0 {
            logutil::info(&format!("still waiting for backend… attempt {attempts}"));
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    Err(format!(
        "Backend did not become ready at {url}.\n\n\
         First launch can take 1–2 minutes (SQLite migrate).\n\n\
         {}",
        logutil::open_logs_hint()
    ))
}
