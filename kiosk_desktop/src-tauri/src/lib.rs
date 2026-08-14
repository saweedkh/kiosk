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
            // Open the UI immediately. Never block (or MessageBox) on /health/.
            // If Django is already running, leave it alone; otherwise spawn it
            // in the background.
            if let Err(err) = backend::start(app.handle()) {
                logutil::error(&format!("backend start: {err}"));
            }

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                match backend::wait_until_ready() {
                    Ok(()) => {
                        logutil::info("backend health OK (background waiter)");
                        let _ = handle.emit("backend-ready", ());
                    }
                    Err(err) => {
                        logutil::error(&format!("backend health wait: {err}"));
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
