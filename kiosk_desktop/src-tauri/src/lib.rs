mod backend;
mod config;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter("info,kiosk_desktop=debug,django=info")
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            backend::start(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("tauri run");
}
