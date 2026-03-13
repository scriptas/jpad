// Suppress warnings from cocoa crate's internal macros
#![allow(unexpected_cfgs)]

use base64::Engine as _;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::Manager;

#[cfg(target_os = "macos")]
#[macro_use]
extern crate objc;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileNode {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub content: Option<String>,
    pub children: Option<Vec<FileNode>>,
}

/// Lists files recursively, sorting folders first then files alphabetically.
#[tauri::command]
fn list_files(path: String) -> Result<Vec<FileNode>, String> {
    let root = Path::new(&path);
    if !root.exists() {
        // Auto-create the notes directory if it doesn't exist
        fs::create_dir_all(&root).map_err(|e| e.to_string())?;
        return Ok(Vec::new());
    }

    let mut folders = Vec::new();
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().unwrap().to_string_lossy().to_string();

            // Skip hidden files/folders
            if name.starts_with('.') {
                continue;
            }

            let is_dir = path.is_dir();
            let kind = if is_dir { "folder" } else { "file" };

            let mut node = FileNode {
                id: path.to_string_lossy().to_string().replace('\\', "/"),
                name,
                kind: kind.to_string(),
                content: None,
                children: None,
            };

            if is_dir {
                node.children = Some(list_files(path.to_string_lossy().to_string())?);
                folders.push(node);
            } else {
                files.push(node);
            }
        }
    }

    // Sort each group alphabetically (case-insensitive)
    folders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Folders first, then files
    folders.extend(files);
    Ok(folders)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read '{}': {}", path, e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&path, &content).map_err(|e| format!("Failed to write '{}': {}", path, e))
}

#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.exists() {
        return Err("File already exists".to_string());
    }
    // Ensure parent directory exists
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&path, "").map_err(|e| format!("Failed to create '{}': {}", path, e))
}

#[tauri::command]
fn create_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    
    // Validate path
    if path.is_empty() || path.ends_with('/') {
        return Err("Invalid folder path".to_string());
    }
    
    // Check if it already exists
    if p.exists() {
        if p.is_dir() {
            return Err("Folder already exists".to_string());
        } else {
            return Err("A file with this name already exists".to_string());
        }
    }
    
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create folder: {}", e))
}

#[tauri::command]
fn delete_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Path does not exist".to_string());
    }
    if p.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete folder '{}': {}", path, e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file '{}': {}", path, e))
    }
}

#[tauri::command]
fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    let old = Path::new(&old_path);
    if !old.exists() {
        return Err(format!("'{}' does not exist", old_path));
    }
    let new_p = Path::new(&new_path);
    if new_p.exists() {
        return Err(format!("'{}' already exists", new_path));
    }
    fs::rename(&old_path, &new_path).map_err(|e| format!("Failed to rename: {}", e))
}

/// Returns the absolute path to the notes directory.
/// Uses ~/Documents/jpad-notes on all platforms.
#[tauri::command]
fn get_notes_root() -> Result<String, String> {
    let docs_dir = dirs::document_dir()
        .ok_or_else(|| "Could not find Documents directory".to_string())?;
    
    let notes_dir = docs_dir.join("jpad-notes");

    // Ensure it exists
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    }

    Ok(notes_dir.to_string_lossy().to_string().replace('\\', "/"))
}

#[tauri::command]
fn reveal_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let path = path.replace('/', "\\");
        Command::new("explorer")
            .arg("/select,")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg("-R")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let parent = std::path::Path::new(&path)
            .parent()
            .unwrap_or(std::path::Path::new(&path));
        Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn delete_with_terminal(paths: Vec<String>) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        // Escape paths for shell
        let escaped_paths: Vec<String> = paths.iter()
            .map(|p| format!("'{}'", p.replace("'", "'\\''")))
            .collect();
        
        // Create rm -rf command
        let rm_command = format!("rm -rf {}", escaped_paths.join(" "));
        
        // Open Terminal and execute the command directly
        // User will see the command and can Cmd+C to cancel before it executes
        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "echo 'Deleting files:' && echo '{}' && echo '' && echo 'Executing: {}' && sleep 2 && {} && echo '' && echo 'Files deleted. Press any key to close...' && read -n 1"
            end tell"#,
            paths.join("\n"),
            rm_command,
            rm_command
        );
        
        Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        return Err("This command is only available on macOS".to_string());
    }
    
    Ok(())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let path = path.replace('/', "\\");
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Read a file as a base64-encoded data URI.
/// Used for embedding images dropped from the OS into the editor.
#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let data = fs::read(&path).map_err(|e| format!("Failed to read '{}': {}", path, e))?;
    let ext = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "avif" => "image/avif",
        _ => "application/octet-stream",
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub match_type: String, // "filename" or "content"
    pub preview: Option<String>, // Preview of matching content
}

/// Search for files by name and content
#[tauri::command]
fn search_files(root_path: String, query: String) -> Result<Vec<SearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }
    
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();
    
    fn search_recursive(
        path: &Path,
        query_lower: &str,
        results: &mut Vec<SearchResult>,
    ) -> Result<(), String> {
        if !path.exists() {
            return Ok(());
        }
        
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                let name = entry_path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                
                // Skip hidden files/folders
                if name.starts_with('.') {
                    continue;
                }
                
                if entry_path.is_dir() {
                    // Recursively search subdirectories
                    search_recursive(&entry_path, query_lower, results)?;
                } else {
                    let path_str = entry_path.to_string_lossy().to_string().replace('\\', "/");
                    
                    // Check filename match
                    if name.to_lowercase().contains(query_lower) {
                        results.push(SearchResult {
                            path: path_str.clone(),
                            name: name.clone(),
                            match_type: "filename".to_string(),
                            preview: None,
                        });
                    }
                    
                    // Check content match for text files
                    if let Ok(content) = fs::read_to_string(&entry_path) {
                        let content_lower = content.to_lowercase();
                        if content_lower.contains(query_lower) {
                            // Find the first match and extract preview
                            if let Some(pos) = content_lower.find(query_lower) {
                                let start = pos.saturating_sub(40);
                                let end = (pos + query_lower.len() + 40).min(content.len());
                                let preview = content[start..end]
                                    .lines()
                                    .next()
                                    .unwrap_or(&content[start..end])
                                    .trim()
                                    .to_string();
                                
                                results.push(SearchResult {
                                    path: path_str,
                                    name,
                                    match_type: "content".to_string(),
                                    preview: Some(preview),
                                });
                            }
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    let root = Path::new(&root_path);
    search_recursive(root, &query_lower, &mut results)?;
    
    // Sort results: filename matches first, then content matches
    results.sort_by(|a, b| {
        match (a.match_type.as_str(), b.match_type.as_str()) {
            ("filename", "content") => std::cmp::Ordering::Less,
            ("content", "filename") => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(results)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            // Get the main window
            let window = app.get_webview_window("main").unwrap();
            
            // Show window after a brief delay to allow React to render
            let window_clone = window.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(100));
                let _ = window_clone.show();
            });
            
            // Apply macOS-specific window styling for rounded corners
            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{NSWindow, NSWindowStyleMask};
                use cocoa::base::id;
                
                unsafe {
                    let ns_window = window.ns_window().unwrap() as id;
                    
                    // Enable shadow
                    ns_window.setHasShadow_(cocoa::base::YES);
                    
                    // Get the content view and set corner radius on its layer
                    let content_view: id = ns_window.contentView();
                    let _: () = msg_send![content_view, setWantsLayer: cocoa::base::YES];
                    let layer: id = msg_send![content_view, layer];
                    let _: () = msg_send![layer, setCornerRadius: 10.0_f64];
                    let _: () = msg_send![layer, setMasksToBounds: cocoa::base::YES];
                    
                    // Enable full size content view
                    let mut style_mask = ns_window.styleMask();
                    style_mask |= NSWindowStyleMask::NSFullSizeContentViewWindowMask;
                    ns_window.setStyleMask_(style_mask);
                }
            }
            
            // Setup tray icon with menu
            let quit = tauri::menu::MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let show = tauri::menu::MenuItemBuilder::with_id("show", "Show").build(app)?;
            let menu = tauri::menu::MenuBuilder::new(app)
                .item(&show)
                .separator()
                .item(&quit)
                .build()?;
            
            let _tray = tauri::tray::TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_files,
            read_file,
            write_file,
            create_file,
            create_folder,
            delete_path,
            rename_path,
            get_notes_root,
            reveal_path,
            open_folder,
            read_file_base64,
            delete_with_terminal,
            search_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
