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
            // Splash (boot.html) owns /health/ polling — do not also hammer from Rust.
            logutil::info("splash waits for backend; Rust does not poll /health/");
            backend::hide_backend_console_windows();
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_always_on_top(true);
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
            // Occasional hide of backend console if it flashed from Startup.
            std::thread::spawn(|| {
                for _ in 0..20 {
                    backend::hide_backend_console_windows();
                    std::thread::sleep(std::time::Duration::from_secs(3));
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("tauri build")
        .run(|_app, _event| {});
}
