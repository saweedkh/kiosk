#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kiosk_desktop_lib::run();
}
