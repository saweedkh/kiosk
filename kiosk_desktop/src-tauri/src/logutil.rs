//! File logging beside kiosk.exe → `logs/kiosk.log` + `logs/django.log`

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use tracing_subscriber::fmt::writer::MakeWriterExt;
use tracing_subscriber::EnvFilter;

static LOG_GUARD: Mutex<Option<tracing_appender::non_blocking::WorkerGuard>> = Mutex::new(None);
static LOGS_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn exe_dir() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
}

/// `…/kiosk.exe` → `…/logs/`
pub fn logs_dir() -> PathBuf {
    LOGS_DIR
        .get_or_init(|| {
            let dir = exe_dir()
                .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
                .join("logs");
            let _ = std::fs::create_dir_all(&dir);
            let readme = dir.join("README.txt");
            if !readme.exists() {
                let _ = std::fs::write(
                    readme,
                    "Kiosk logs (next to kiosk.exe)\r\n\
                     - kiosk.log  = app / Tauri / startup\r\n\
                     - django.log = backend process stdout/stderr\r\n",
                );
            }
            dir
        })
        .clone()
}

fn stamp() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string()
}

/// Append one line to logs/kiosk.log (and tracing).
pub fn info(msg: &str) {
    write_raw("kiosk.log", &format!("[{}] {}", stamp(), msg));
    tracing::info!("{msg}");
}

pub fn warn(msg: &str) {
    write_raw("kiosk.log", &format!("[{}] WARN {}", stamp(), msg));
    tracing::warn!("{msg}");
}

pub fn error(msg: &str) {
    write_raw("kiosk.log", &format!("[{}] ERROR {}", stamp(), msg));
    tracing::error!("{msg}");
}

pub fn django_line(stream: &str, line: &str) {
    write_raw(
        "django.log",
        &format!("[{}] [{stream}] {line}", stamp()),
    );
    write_raw(
        "kiosk.log",
        &format!("[{}] django/{stream}: {line}", stamp()),
    );
}

fn write_raw(filename: &str, line: &str) {
    let path = logs_dir().join(filename);
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(f, "{line}");
        let _ = f.flush();
    }
}

/// Init tracing → file `logs/kiosk.log` (keep WorkerGuard for process lifetime).
pub fn init_tracing() {
    let dir = logs_dir();
    let appender = tracing_appender::rolling::never(&dir, "kiosk.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(appender);
    *LOG_GUARD.lock().unwrap() = Some(guard);

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,kiosk_desktop=debug,django=info"));

    // Also try stderr (useful in `tauri dev`; no-op for GUI release)
    let writer = non_blocking.and(std::io::stderr);

    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_ansi(false)
        .with_writer(writer)
        .with_target(true)
        .try_init();

    info(&format!("logging to {}", dir.join("kiosk.log").display()));
}

pub fn open_logs_hint() -> String {
    format!(
        "Logs folder:\n{}",
        logs_dir().display()
    )
}
