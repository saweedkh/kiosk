mod backend;
mod config;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter("info,kiosk_desktop=debug,django=info")
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if let Err(err) = backend::start(app.handle()) {
                backend::show_fatal(&err);
                return Err(err.into());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("tauri run");
}
