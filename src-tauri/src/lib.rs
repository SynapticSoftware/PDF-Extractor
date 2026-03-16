use std::fs;
use std::path::PathBuf;

/// Writes binary contents to a file path. Called from the frontend via Tauri IPC
/// to save exported ZIP archives to the user-selected location.
#[tauri::command]
fn write_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    let file_path = PathBuf::from(&path);
    fs::write(&file_path, &contents).map_err(|e| format!("Failed to write file: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![write_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
