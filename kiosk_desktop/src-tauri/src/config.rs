//! Application configuration (env + defaults).

use std::path::PathBuf;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub api_host: String,
    pub api_port: u16,
    pub pos_host: String,
    pub pos_port: u16,
    pub payment_gateway: String,
    #[allow(dead_code)]
    pub dll_path: Option<PathBuf>,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            api_host: std::env::var("KIOSK_API_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            api_port: std::env::var("KIOSK_API_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8000),
            pos_host: std::env::var("POS_TCP_HOST").unwrap_or_else(|_| "192.168.1.102".into()),
            pos_port: std::env::var("POS_TCP_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(1362),
            payment_gateway: std::env::var("PAYMENT_GATEWAY_NAME").unwrap_or_else(|_| {
                if cfg!(target_os = "windows") {
                    "dll".into()
                } else {
                    "mock".into()
                }
            }),
            dll_path: std::env::var("POS_DLL_PATH").ok().map(PathBuf::from),
        }
    }
}
