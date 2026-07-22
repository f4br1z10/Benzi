use std::{
    fs,
    io::{Read, Write},
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

fn server_is_ready(port: u16) -> bool {
    let address = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(500)) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_secs(3)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(1)));
    if stream
        .write_all(b"GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
        .is_err()
    {
        return false;
    }
    let mut response = [0_u8; 64];
    let Ok(read) = stream.read(&mut response) else {
        return false;
    };
    let status = String::from_utf8_lossy(&response[..read]);
    status.starts_with("HTTP/1.1 200") || status.starts_with("HTTP/1.1 30")
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
            } else if entry
                .file_name()
                .to_string_lossy()
                .eq_ignore_ascii_case("chrome-headless-shell.exe")
            {
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
            let pdf_dir = app.path().document_dir()?.join("Preventivi SG Clima");
            fs::create_dir_all(&pdf_dir)?;
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
            let log_path = data_dir
                .join("storage")
                .join("logs")
                .join("desktop-server.log");
            let server_log = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&log_path)?;
            let server_dir = resource_dir.join("resources").join("server");
            let mut command = Command::new(
                resource_dir
                    .join("resources")
                    .join("runtime")
                    .join("node.exe"),
            );
            command
                .arg("--eval")
                .arg("require('./server.js')")
                .current_dir(&server_dir)
                .env("NODE_ENV", "production")
                .env("HOSTNAME", "127.0.0.1")
                .env("PORT", port.to_string())
                .env("APP_URL", &url)
                .env("DATABASE_URL", database_url)
                .env("GESTIONE_PREVENTIVI_DATA_DIR", &data_dir)
                .env("GESTIONE_PREVENTIVI_PDF_DIR", &pdf_dir)
                .stdin(Stdio::null())
                .stdout(Stdio::from(server_log.try_clone()?))
                .stderr(Stdio::from(server_log));
            if let Some(browser) = find_browser(&resource_dir) {
                command.env("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", browser);
            }
            #[cfg(windows)]
            command.creation_flags(0x08000000);
            let child = command.spawn()?;
            app.manage(ServerProcess(Mutex::new(Some(child))));

            thread::spawn(move || {
                for _ in 0..240 {
                    if server_is_ready(port) {
                        let window_url = url.parse().expect("URL locale non valida");
                        let window_handle = handle.clone();
                        let _ = handle.run_on_main_thread(move || {
                            if let Err(error) = WebviewWindowBuilder::new(
                                &window_handle,
                                "main",
                                WebviewUrl::External(window_url),
                            )
                            .title("Gestione Preventivi")
                            .inner_size(1440.0, 900.0)
                            .min_inner_size(1100.0, 700.0)
                            .center()
                            .build()
                            {
                                if let Ok(mut log) = fs::OpenOptions::new()
                                    .create(true)
                                    .append(true)
                                    .open(&log_path)
                                {
                                    let _ =
                                        writeln!(log, "Errore creazione finestra WebView: {error}");
                                }
                                window_handle.exit(1);
                            }
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
        .expect("errore durante l'avvio di Gestione Preventivi")
        .run(|app, event| {
            if matches!(
                event,
                tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
            ) {
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
