//! Spawn bundled Django backend next to the app EXE and wait until /health/ is ready.

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};

use crate::config::AppConfig;

pub struct BackendHandle {
    #[allow(dead_code)]
    child: Mutex<Child>,
}

fn exe_dir() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
}

fn append_log(msg: &str) {
    let line = format!("[{}] {}\n", now_stamp(), msg);
    if let Some(dir) = exe_dir() {
        let path = dir.join("kiosk-startup.log");
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .and_then(|mut f| {
                use std::io::Write;
                f.write_all(line.as_bytes())
            });
    }
    tracing::info!("{}", msg);
}

fn now_stamp() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_else(|_| "?".into())
}

#[cfg(target_os = "windows")]
pub fn show_fatal(msg: &str) {
    append_log(&format!("FATAL: {msg}"));
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

    let text = wide(msg);
    let caption = wide("Kiosk");
    unsafe {
        MessageBoxW(null_mut(), text.as_ptr(), caption.as_ptr(), 0x10);
    }
}

#[cfg(not(target_os = "windows"))]
pub fn show_fatal(msg: &str) {
    append_log(&format!("FATAL: {msg}"));
    eprintln!("Kiosk fatal: {msg}");
}

pub fn start(app: &AppHandle) -> Result<(), String> {
    let config = AppConfig::from_env();
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    append_log(&format!(
        "exe_dir={:?} data_dir={} api={}:{}",
        exe_dir(),
        data_dir.display(),
        config.api_host,
        config.api_port
    ));

    let child = spawn_backend(&config, &data_dir)?;
    app.manage(BackendHandle {
        child: Mutex::new(child),
    });

    wait_for_health(&config)?;
    append_log(&format!(
        "Django ready http://{}:{}/",
        config.api_host, config.api_port
    ));
    Ok(())
}

fn find_backend_binary() -> Result<PathBuf, String> {
    let dir = exe_dir().ok_or_else(|| "cannot resolve kiosk.exe directory".to_string())?;
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

    // Dev: python main.py from repo
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
         See kiosk-startup.log for details.",
        dir.display()
    ))
}

fn spawn_backend(config: &AppConfig, data_dir: &Path) -> Result<Child, String> {
    let path = find_backend_binary()?;
    append_log(&format!("starting backend {}", path.display()));

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
        .env("KIOSK_API_HOST", &config.api_host)
        .env("KIOSK_API_PORT", config.api_port.to_string())
        .env("DJANGO_SETTINGS_MODULE", "config.settings.desktop")
        .env("PAYMENT_GATEWAY_NAME", &config.payment_gateway)
        .env("POS_TCP_HOST", &config.pos_host)
        .env("POS_TCP_PORT", config.pos_port.to_string())
        .env("SEED_DEMO_DATA", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd.spawn().map_err(|e| {
        format!(
            "Failed to start backend {}: {e}",
            path.display()
        )
    })?;

    if let Some(out) = child.stdout.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().flatten() {
                tracing::info!(target: "django", "{line}");
                append_log(&format!("stdout: {line}"));
            }
        });
    }
    if let Some(err) = child.stderr.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().flatten() {
                tracing::warn!(target: "django", "{line}");
                append_log(&format!("stderr: {line}"));
            }
        });
    }

    Ok(child)
}

fn wait_for_health(config: &AppConfig) -> Result<(), String> {
    let url = format!(
        "http://{}:{}/health/",
        config.api_host, config.api_port
    );
    append_log(&format!("waiting for {url} (up to 3 min for first migrate)"));
    let deadline = Instant::now() + Duration::from_secs(180);

    while Instant::now() < deadline {
        if ureq::get(&url)
            .timeout(Duration::from_secs(2))
            .call()
            .map(|r| r.status() == 200)
            .unwrap_or(false)
        {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    Err(format!(
        "Backend did not become ready at {url}.\n\n\
         Open kiosk-startup.log next to kiosk.exe.\n\
         First launch can take 1–2 minutes (SQLite migrate)."
    ))
}
