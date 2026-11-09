use super::*;
use tauri::test::{mock_builder, mock_context, noop_assets};

fn invoke(command: &str, body: Value) -> Result<Value, Value> {
    let app = mock_builder()
        .invoke_handler(tauri::generate_handler![
            read_actone_bundle,
            unpack_actone_bundle,
            pack_actone_bundle,
            save_actone_bundle,
            crate::file_formats::prepare_fountain_export,
            crate::file_formats::import_script_content,
        ])
        .build(mock_context(noop_assets()))
        .unwrap();
    let window = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();
    tauri::test::get_ipc_response(
        &window,
        tauri::webview::InvokeRequest {
            cmd: command.into(),
            callback: tauri::ipc::CallbackFn(0),
            error: tauri::ipc::CallbackFn(1),
            // Tauri treats the app origin differently on Windows and Linux.
            // Using the Windows origin on Linux makes local commands fail ACL checks.
            url: if cfg!(any(windows, target_os = "android")) {
                "http://tauri.localhost"
            } else {
                "tauri://localhost"
            }.parse().unwrap(),
            body: tauri::ipc::InvokeBody::Json(body),
            headers: Default::default(),
            invoke_key: tauri::test::INVOKE_KEY.into(),
        },
    )
    .map(|r| r.deserialize::<Value>().unwrap())
}

#[test]
fn native_pack_unpack_accepts_frontend_camel_case_payloads() {
    let scripts = json!([{"name":"Draft","fileName":"files/draft.fountain","content":"INT. ROOM - DAY\n\nHi.","savedContent":"","type":"fountain"}]);
    let bytes = invoke(
        "pack_actone_bundle",
        json!({"scripts":scripts,"settings":{"custom":true}}),
    )
    .unwrap();
    let bundle = invoke(
        "unpack_actone_bundle",
        json!({"bytes":bytes,"bundleName":"Draft"}),
    )
    .unwrap();
    assert_eq!(bundle["scripts"][0]["content"], scripts[0]["content"]);
    assert_eq!(bundle["settings"]["custom"], true);
    assert_eq!(bundle["isLegacy"], false);
}

#[test]
fn native_export_preparation_validates_arguments() {
    assert_eq!(invoke("prepare_fountain_export",json!({"rawText":"int. room - day","options":{"sections":false,"synopses":false,"titlePage":true}})).unwrap(),"INT. ROOM - DAY\n");
    assert!(
        invoke(
            "prepare_fountain_export",
            json!({"fountainText":"wrong argument"})
        )
        .is_err()
    );
}

#[test]
fn native_reader_and_import_errors_reach_frontend() {
    assert!(
        invoke(
            "read_actone_bundle",
            json!({"path":"missing-project-for-ipc-test.actone"})
        )
        .is_err()
    );
    assert!(
        invoke(
            "import_script_content",
            json!({"path":"missing-script-for-ipc-test.fdx"})
        )
        .is_err()
    );
    assert!(invoke("unpack_actone_bundle", json!({"bytes":[65,67,84,49]})).is_err());
}

#[test]
fn native_save_read_preserves_selected_path_and_content() {
    let dir = std::env::temp_dir().join(format!("actone_ipc_{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join("தமிழ் Draft.actOne");
    let scripts = json!([{"name":"Draft","fileName":"files/draft.md","content":"# नमस्ते 🎭","type":"markdown"}]);
    assert!(
        invoke(
            "save_actone_bundle",
            json!({"path":path,"scripts":scripts,"settings":{}})
        )
        .unwrap()
        .is_null()
    );
    let opened = invoke(
        "read_actone_bundle",
        json!({"path":path,"bundleName":"Draft"}),
    )
    .unwrap();
    assert_eq!(opened["scripts"][0]["content"], scripts[0]["content"]);
    let original = std::fs::read(&path).unwrap();
    assert!(
        invoke(
            "save_actone_bundle",
            json!({"path":path,"scripts":[scripts[0],scripts[0]],"settings":{}})
        )
        .is_err()
    );
    assert_eq!(std::fs::read(&path).unwrap(), original);
    std::fs::remove_dir_all(dir).unwrap();
}
