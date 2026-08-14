//! Wait for an operator-started Django backend. kiosk.exe does not spawn it.

use std::time::{Duration, Instant};

use crate::config::AppConfig;
use crate::logutil;

/// Native /health/ probe — WebView fetch to loopback often fails (PNA / CSP).
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

/// True when POS warm-up finished (or field missing on older backends).
fn pos_warm_settled(body: &str) -> bool {
    if !body.contains("pos_warm") {
        return true;
    }
    for value in ["ready", "failed", "skipped"] {
        let spaced = format!("\"pos_warm\": \"{value}\"");
        let compact = format!("\"pos_warm\":\"{value}\"");
        if body.contains(&spaced) || body.contains(&compact) {
            return true;
        }
    }
    false
}

fn probe_health(config: &AppConfig) -> Option<String> {
    let response = ureq::get(&health_url(config))
        .timeout(Duration::from_secs(2))
        .call()
        .ok()?;
    if response.status() != 200 {
        return None;
    }
    response.into_string().ok()
}

fn wait_for_health(config: &AppConfig) -> Result<(), String> {
    let url = health_url(config);
    logutil::info(&format!(
        "native wait for {url} every 5s (incl. POS warm-up)"
    ));
    let mut attempts = 0u32;
    let mut health_since: Option<Instant> = None;
    // Don't block the UI forever if the POS is offline — CLR may still be loaded.
    let warm_grace = Duration::from_secs(90);

    loop {
        attempts += 1;
        if attempts == 1 {
            hide_backend_console_windows();
        }

        if let Some(body) = probe_health(config) {
            if health_since.is_none() {
                health_since = Some(Instant::now());
                logutil::info("health OK — waiting for POS warm-up if needed");
            }
            if pos_warm_settled(&body) {
                logutil::info(&format!(
                    "backend ready after {attempts} native attempts (pos warm settled)"
                ));
                return Ok(());
            }
            if health_since.unwrap().elapsed() >= warm_grace {
                logutil::info(
                    "POS warm-up still pending after 90s — entering app anyway",
                );
                return Ok(());
            }
        }

        if attempts == 1 || attempts % 6 == 0 {
            logutil::info(&format!("still waiting for backend… attempt {attempts}"));
        }
        std::thread::sleep(Duration::from_secs(5));
    }
}

/// Hide the black backend console if the sidecar was started from Startup.
pub fn hide_backend_console_windows() {
    #[cfg(windows)]
    winhide::hide_kiosk_backend_consoles();
}

#[cfg(windows)]
mod winhide {
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
        if title.contains("kiosk-backend")
            || title.contains("kiosk-bale-poll")
            || title.contains("kiosk-pos-worker")
        {
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
