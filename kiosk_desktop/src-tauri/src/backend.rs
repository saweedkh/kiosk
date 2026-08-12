//! Spawn bundled Django backend (Tauri sidecar) and wait until /health/ is ready.

use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

use crate::config::AppConfig;

pub struct BackendHandle {
    #[allow(dead_code)]
    child: tauri_plugin_shell::process::CommandChild,
}

fn bytes_to_log(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).trim_end().to_string()
}

pub fn start(app: &AppHandle) -> Result<(), String> {
    let config = AppConfig::from_env();
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let child = spawn_sidecar(app, &config, &data_dir)
        .or_else(|sidecar_err| {
            tracing::warn!("sidecar spawn failed ({sidecar_err}); trying dev python");
            spawn_dev_python(app, &config, &data_dir)
        })?;

    app.manage(Mutex::new(BackendHandle { child }));

    wait_for_health(&config)?;
    tracing::info!("Django backend ready at http://{}:{}/", config.api_host, config.api_port);
    Ok(())
}

fn spawn_sidecar(
    app: &AppHandle,
    config: &AppConfig,
    data_dir: &std::path::Path,
) -> Result<tauri_plugin_shell::process::CommandChild, String> {
    let (mut rx, child) = app
        .shell()
        .sidecar("kiosk-backend")
        .map_err(|e| e.to_string())?
        .env("KIOSK_DATA_DIR", data_dir.to_string_lossy().to_string())
        .env("KIOSK_API_HOST", &config.api_host)
        .env("KIOSK_API_PORT", config.api_port.to_string())
        .env("DJANGO_SETTINGS_MODULE", "config.settings.desktop")
        .env("PAYMENT_GATEWAY_NAME", &config.payment_gateway)
        .env("POS_TCP_HOST", &config.pos_host)
        .env("POS_TCP_PORT", config.pos_port.to_string())
        .spawn()
        .map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    tracing::info!(target: "django", "{}", bytes_to_log(&line));
                }
                CommandEvent::Stderr(line) => {
                    tracing::warn!(target: "django", "{}", bytes_to_log(&line));
                }
                CommandEvent::Error(err) => tracing::error!(target: "django", "{}", err),
                CommandEvent::Terminated(payload) => {
                    tracing::error!(target: "django", "backend exited: {:?}", payload);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(child)
}

fn spawn_dev_python(
    app: &AppHandle,
    config: &AppConfig,
    data_dir: &std::path::Path,
) -> Result<tauri_plugin_shell::process::CommandChild, String> {
    let repo_root = std::env::current_dir().map_err(|e| e.to_string())?;
    let backend_main = repo_root.join("kiosk_backend").join("main.py");
    if !backend_main.is_file() {
        return Err(format!("dev backend not found: {}", backend_main.display()));
    }

    let python = std::env::var("KIOSK_PYTHON").unwrap_or_else(|_| "python3".into());

    let (mut rx, child) = app
        .shell()
        .command(python)
        .args([backend_main.to_string_lossy().to_string()])
        .current_dir(&repo_root)
        .env("KIOSK_DATA_DIR", data_dir.to_string_lossy().to_string())
        .env("KIOSK_API_HOST", &config.api_host)
        .env("KIOSK_API_PORT", config.api_port.to_string())
        .env("DJANGO_SETTINGS_MODULE", "config.settings.desktop")
        .env("PAYMENT_GATEWAY_NAME", &config.payment_gateway)
        .env("POS_TCP_HOST", &config.pos_host)
        .env("POS_TCP_PORT", config.pos_port.to_string())
        .spawn()
        .map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                tracing::info!(target: "django", "{}", bytes_to_log(&line));
            }
        }
    });

    Ok(child)
}

fn wait_for_health(config: &AppConfig) -> Result<(), String> {
    let url = format!(
        "http://{}:{}/health/",
        config.api_host, config.api_port
    );
    let deadline = Instant::now() + Duration::from_secs(120);

    while Instant::now() < deadline {
        if ureq::get(&url).call().map(|r| r.status() == 200).unwrap_or(false) {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    Err(format!("backend health timeout: {url}"))
}
