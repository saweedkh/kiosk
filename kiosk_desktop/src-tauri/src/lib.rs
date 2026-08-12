mod backend;
mod config;
mod logutil;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logutil::init_tracing();

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
