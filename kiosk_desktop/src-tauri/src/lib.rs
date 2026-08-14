mod backend;
mod config;
mod logutil;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logutil::init_tracing();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Prefer native /health/ (ureq). WebView fetch to 127.0.0.1 is often blocked.
            logutil::info("native health waiter starting (5s interval)");
            backend::hide_backend_console_windows();
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_always_on_top(true);
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                if let Err(err) = backend::wait_until_ready() {
                    logutil::error(&format!("backend wait: {err}"));
                    return;
                }
                logutil::info("backend health OK — entering app");
                if let Some(win) = handle.get_webview_window("main") {
                    let _ = win.set_always_on_top(true);
                    let _ = win.unminimize();
                    let _ = win.show();
                    let _ = win.set_focus();
                    let _ = win.eval(
                        "try { window.__kioskBackendReady = true; } catch (e) {} location.replace('index.html');",
                    );
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("tauri build")
        .run(|_app, _event| {});
}
