use std::fs;
use std::path::PathBuf;

/// Writes binary contents to a file path. Called from the frontend via Tauri IPC
/// to save exported ZIP archives to the user-selected location.
#[tauri::command]
fn write_file(path: String, contents: Vec<u8>) -> Result<(), String> {
    let file_path = PathBuf::from(&path);
    fs::write(&file_path, &contents).map_err(|e| format!("Failed to write file: {e}"))
}

/// Clears the WebView2 cache when the app version changes.
/// Prevents stale frontend assets from persisting across updates.
fn clear_webview_cache_on_upgrade(app_data_dir: &PathBuf, current_version: &str) {
    let version_file = app_data_dir.join(".cached_version");
    let cached_version = fs::read_to_string(&version_file).unwrap_or_default();

    if cached_version.trim() != current_version {
        let cache_dir = app_data_dir.join("EBWebView");
        if cache_dir.exists() {
            let _ = fs::remove_dir_all(&cache_dir);
        }
        let _ = fs::create_dir_all(app_data_dir);
        let _ = fs::write(&version_file, current_version);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let context = tauri::generate_context!();
    let version = context.config().version.clone().unwrap_or_default();

    if let Some(data_dir) = dirs::data_local_dir() {
        let app_data_dir = data_dir.join(&context.config().identifier);
        clear_webview_cache_on_upgrade(&app_data_dir, &version);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![write_file])
        .run(context)
        .expect("error while running tauri application");
}
