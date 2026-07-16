use std::{
    fs,
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::Duration,
};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

struct ServerProcess(Mutex<Option<Child>>);

fn copy_directory(source: &Path, target: &Path) -> std::io::Result<()> {
    fs::create_dir_all(target)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_directory(&source_path, &target_path)?;
        } else {
            fs::copy(source_path, target_path)?;
        }
    }
    Ok(())
}

fn initialize_data(template: &Path, data_dir: &Path) -> std::io::Result<()> {
    let database = data_dir.join("storage").join("sg-clima.db");
    if !database.exists() {
        copy_directory(template, data_dir)?;
    }
    for directory in [
        "logos",
        "product-attachments",
        "product-images",
        "generated-quotes",
        "backups",
        "logs",
        "imports",
    ] {
        fs::create_dir_all(data_dir.join("storage").join(directory))?;
    }
    fs::create_dir_all(data_dir.join("output").join("pdf"))?;
    Ok(())
}

fn available_port() -> std::io::Result<u16> {
    let listener = TcpListener::bind(("127.0.0.1", 0))?;
    Ok(listener.local_addr()?.port())
}

fn find_browser(resource_dir: &Path) -> Option<PathBuf> {
    let root = resource_dir.join("resources").join("browser");
    let mut pending = vec![root];
    while let Some(directory) = pending.pop() {
        for entry in fs::read_dir(directory).ok()? {
            let entry = entry.ok()?;
            let path = entry.path();
            if entry.file_type().ok()?.is_dir() {
                pending.push(path);
            } else if entry.file_name().to_string_lossy().eq_ignore_ascii_case("chrome-headless-shell.exe") {
                return Some(path);
            }
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            let resource_dir = app.path().resource_dir()?;
            let data_dir = app.path().app_local_data_dir()?;
            initialize_data(
                &resource_dir.join("resources").join("template-data"),
                &data_dir,
            )?;

            let port = available_port()?;
            let url = format!("http://127.0.0.1:{port}");
            let database_url = format!(
                "file:{}",
                data_dir
                    .join("storage")
                    .join("sg-clima.db")
                    .to_string_lossy()
                    .replace('\\', "/")
            );
            let mut command = Command::new(
                resource_dir.join("resources").join("runtime").join("node.exe"),
            );
            command
                .arg(resource_dir.join("resources").join("server").join("server.js"))
                .current_dir(&data_dir)
                .env("NODE_ENV", "production")
                .env("HOSTNAME", "127.0.0.1")
                .env("PORT", port.to_string())
                .env("APP_URL", &url)
                .env("DATABASE_URL", database_url)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null());
            if let Some(browser) = find_browser(&resource_dir) {
                command.env("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", browser);
            }
            #[cfg(windows)]
            command.creation_flags(0x08000000);
            let child = command.spawn()?;
            app.manage(ServerProcess(Mutex::new(Some(child))));

            thread::spawn(move || {
                for _ in 0..120 {
                    if TcpStream::connect(("127.0.0.1", port)).is_ok() {
                        let window_url = url.parse().expect("URL locale non valida");
                        let window_handle = handle.clone();
                        let _ = handle.run_on_main_thread(move || {
                            let _ = WebviewWindowBuilder::new(
                                &window_handle,
                                "main",
                                WebviewUrl::External(window_url),
                            )
                            .title("Benzxi - Gestione preventivi")
                            .inner_size(1440.0, 900.0)
                            .min_inner_size(1100.0, 700.0)
                            .center()
                            .build();
                        });
                        return;
                    }
                    thread::sleep(Duration::from_millis(250));
                }
                handle.exit(1);
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("errore durante l'avvio di Benzxi")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }) {
                if let Some(state) = app.try_state::<ServerProcess>() {
                    if let Ok(mut child) = state.0.lock() {
                        if let Some(mut child) = child.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
