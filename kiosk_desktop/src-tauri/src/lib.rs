mod backend;
mod config;
mod logutil;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logutil::init_tracing();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Splash is boot.html (no /health/ poll). Spawn Django only if
            // the sidecar is not already running.
            if let Err(err) = backend::start(app.handle()) {
                logutil::error(&format!("backend start: {err}"));
            }
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
