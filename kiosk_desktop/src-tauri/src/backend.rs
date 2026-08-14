//! Wait for an operator-started Django backend. kiosk.exe does not spawn it.

use std::time::{Duration, Instant};

use crate::config::AppConfig;
use crate::logutil;

/// Block until `/health/` returns 200.
pub fn wait_until_ready() -> Result<(), String> {
    let config = AppConfig::from_env();
    wait_for_health(&config)
}

fn health_url(config: &AppConfig) -> String {
    let probe_host = if config.api_host == "0.0.0.0" {
        "127.0.0.1"
    } else {
        config.api_host.as_str()
    };
    format!("http://{}:{}/health/", probe_host, config.api_port)
}

fn probe_health(config: &AppConfig) -> bool {
    ureq::get(&health_url(config))
        .timeout(Duration::from_secs(2))
        .call()
        .map(|r| r.status() == 200)
        .unwrap_or(false)
}

fn wait_for_health(config: &AppConfig) -> Result<(), String> {
    let url = health_url(config);
    logutil::info(&format!(
        "waiting for {url} (start kiosk-backend.exe separately if needed)"
    ));
    let mut attempts = 0u32;
    loop {
        attempts += 1;
        hide_backend_console_windows();
        if probe_health(config) {
            logutil::info(&format!("health OK after {attempts} attempts"));
            hide_backend_console_windows();
            return Ok(());
        }
        if attempts == 1 || attempts % 10 == 0 {
            logutil::info(&format!("still waiting for backend… attempt {attempts}"));
        }
        std::thread::sleep(Duration::from_millis(500));
    }
}

/// Hide the black backend console if the sidecar was started from Startup.
pub fn hide_backend_console_windows() {
    #[cfg(windows)]
    winhide::hide_kiosk_backend_consoles();
}

#[cfg(windows)]
mod winhide {
    use std::ptr::null_mut;

    const SW_HIDE: i32 = 0;

    #[link(name = "user32")]
    extern "system" {
        fn EnumWindows(
            cb: unsafe extern "system" fn(*mut core::ffi::c_void, isize) -> i32,
            lparam: isize,
        ) -> i32;
        fn GetClassNameW(hwnd: *mut core::ffi::c_void, buf: *mut u16, max: i32) -> i32;
        fn GetWindowTextW(hwnd: *mut core::ffi::c_void, buf: *mut u16, max: i32) -> i32;
        fn ShowWindow(hwnd: *mut core::ffi::c_void, cmd: i32) -> i32;
        fn IsWindowVisible(hwnd: *mut core::ffi::c_void) -> i32;
    }

    fn utf16_to_lower(buf: &[u16], n: i32) -> String {
        if n <= 0 {
            return String::new();
        }
        String::from_utf16_lossy(&buf[..n as usize]).to_ascii_lowercase()
    }

    unsafe extern "system" fn enum_cb(hwnd: *mut core::ffi::c_void, _lparam: isize) -> i32 {
        let mut class_buf = [0u16; 64];
        let cn = GetClassNameW(hwnd, class_buf.as_mut_ptr(), class_buf.len() as i32);
        let class_name = utf16_to_lower(&class_buf, cn);
        if class_name != "consolewindowclass" {
            return 1;
        }
        let mut title_buf = [0u16; 512];
        let tn = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), title_buf.len() as i32);
        let title = utf16_to_lower(&title_buf, tn);
        if title.contains("kiosk-backend") {
            if IsWindowVisible(hwnd) != 0 {
                ShowWindow(hwnd, SW_HIDE);
            }
        }
        1
    }

    pub fn hide_kiosk_backend_consoles() {
        unsafe {
            EnumWindows(enum_cb, 0);
        }
    }
}
