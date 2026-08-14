mod backend;
mod config;
mod logutil;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logutil::init_tracing();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Spawn Django immediately; do not block the UI on /health/.
            // Window opens on boot.html which shows loading / errors.
            if let Err(err) = backend::start(app.handle()) {
                backend::show_fatal(&err);
                return Err(err.into());
            }

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                if let Err(err) = backend::wait_until_ready() {
                    // MessageBox backup if the splash times out / user misses it
                    backend::show_fatal(&err);
                } else {
                    logutil::info("backend health OK (background waiter)");
                    let _ = handle.emit("backend-ready", ());
                    // Ensure WebView leaves boot.html even if splash JS stalls
                    if let Some(win) = handle.get_webview_window("main") {
                        let _ = win.eval(
                            "if (!/index\\.html?$/i.test(location.pathname)) { location.replace('index.html'); }",
                        );
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("tauri build")
        .run(|app, event| {
            if matches!(
                event,
                tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
            ) {
                backend::stop(app);
            }
        });
}
