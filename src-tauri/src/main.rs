// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod parser;
mod simulation;
mod errors;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init()) // Keep if you use opener
        .invoke_handler(tauri::generate_handler![
            simulation::start_simulation,
            simulation::generate_customers
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}