use super::*;

fn bytes(value: &Value) -> Vec<u8> {
    STANDARD
        .decode(value["$bytes"].as_str().expect("base64 fixture bytes"))
        .unwrap()
}
fn zip_entries(bytes: &[u8]) -> BTreeMap<String, Value> {
    let mut archive =
        ZipArchive::new(Cursor::new(bytes.strip_prefix(b"ACT1").unwrap_or(bytes))).unwrap();
    let mut entries = BTreeMap::new();
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).unwrap();
        let mut data = Vec::new();
        file.read_to_end(&mut data).unwrap();
        let value = if file.name().ends_with(".json") && !data.is_empty() {
            serde_json::from_slice(&data).unwrap()
        } else if file.name().ends_with(".excalidraw") {
            serde_json::from_slice(&data).unwrap()
        } else {
            json!(STANDARD.encode(data))
        };
        entries.insert(file.name().into(), value);
    }
    entries
}

fn run_oracle(file: &str, indices: &[usize]) {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/file-core")
        .join(file);
    let cases: Vec<Value> = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    for &i in indices {
        let case = &cases[i];
        let args = case["args"].as_array().unwrap();
        let name = case["name"].as_str().unwrap();
        let expected = &case["expected"];
        let label = case["test"].as_str().unwrap();
        let actual = match name {
            "packActoneBundle" | "packActoneBundleAsync" => {
                let scripts: Vec<ScriptInfo> = serde_json::from_value(args[0].clone()).unwrap();
                let packed = pack(&scripts, args[1].as_object().unwrap()).unwrap();
                assert_eq!(
                    zip_entries(&packed),
                    zip_entries(&bytes(expected)),
                    "{label}: archive entries"
                );
                continue;
            }
            "unpackActoneBundle" => serde_json::to_value(
                unpack(&bytes(&args[0]), args.get(1).and_then(Value::as_str)).unwrap(),
            )
            .unwrap(),
            "stripFountainForExport" => json!(crate::file_formats::strip_fountain(
                args[0].as_str().unwrap(),
                &serde_json::from_value(args[1].clone()).unwrap()
            )),
            "parseFadeInXmlToFountain" => json!(crate::file_formats::import_xml(
                args[0].as_str().unwrap(),
                true
            )),
            "parseFdxToFountain" => json!(crate::file_formats::import_xml(
                args[0].as_str().unwrap(),
                false
            )),
            "parseFadeInToFountain" => json!(
                crate::file_formats::import_script("script.fadein", &bytes(&args[0])).unwrap()
            ),
            "parseScriptFileToFountain" => {
                let name = args[0].as_str().unwrap();
                if let Some(text) = args[1].as_str() {
                    if name.to_lowercase().ends_with(".fadein") && text.contains("<fadein") {
                        json!(crate::file_formats::import_xml(text, true))
                    } else {
                        json!(crate::file_formats::import_script(name, text.as_bytes()).unwrap())
                    }
                } else {
                    json!(crate::file_formats::import_script(name, &bytes(&args[1])).unwrap())
                }
            }
            _ => crate::project_state::run_oracle(name, args),
        };
        assert_eq!(&actual, expected, "{label}: {name}, call {i}");
    }
}

include!("oracle_cases.rs");

#[test]
fn unicode_mixed_document_round_trip() {
    let scripts: Vec<ScriptInfo> = serde_json::from_value(json!([
        {"name":"தமிழ் 🎭","fileName":"files/தமிழ்.fountain","content":"காட்சி\n\nHello.","type":"fountain"},
        {"name":"Notes","fileName":"files/Notes.md","content":"# नमस्ते\n\n**Notes**","type":"markdown"}
    ])).unwrap();
    let settings = json!({"custom":{"unknown":[1,true,"🎭"]},"notepad":{"files/Notes.md":"notes"}})
        .as_object()
        .unwrap()
        .clone();
    let bytes = pack(&scripts, &settings).unwrap();
    assert!(bytes.starts_with(b"ACT1PK"));
    let bundle = unpack(&bytes, None).unwrap();
    assert_eq!(
        bundle
            .scripts
            .iter()
            .map(|s| &s.content)
            .collect::<Vec<_>>(),
        scripts.iter().map(|s| &s.content).collect::<Vec<_>>()
    );
    assert_eq!(bundle.settings["custom"], settings["custom"]);
    assert!(!bundle.is_legacy);
}

#[test]
fn corrupt_archive_and_manifest_fail_without_panic() {
    for bytes in [b"".as_slice(), b"ACT1", b"ACT1broken"] {
        assert!(unpack(bytes, None).is_err());
    }
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    writer
        .start_file("project.json", SimpleFileOptions::default())
        .unwrap();
    writer.write_all(b"{broken}").unwrap();
    assert!(unpack(&writer.finish().unwrap().into_inner(), None).is_err());
}

#[test]
fn duplicate_and_reserved_document_paths_fail_before_writing() {
    let script = ScriptInfo {
        kind: fountain(),
        name: "Main".into(),
        file_name: "settings.json".into(),
        content: "original".into(),
        saved_content: String::new(),
    };
    assert!(pack(&[script.clone()], &Map::new()).is_err());
    let script = ScriptInfo {
        file_name: "files/main.fountain".into(),
        ..script
    };
    assert!(pack(&[script.clone(), script], &Map::new()).is_err());
}

#[test]
fn missing_canvas_asset_fails_without_silent_image_loss() {
    let content =
        json!({"type":"excalidraw","files":{"image":{"actoneAsset":"assets/missing"}}}).to_string();
    assert!(
        restore_canvas(&content, &Entries::new())
            .unwrap_err()
            .contains("Missing Canvas image")
    );
}

#[test]
fn canvas_component_encoding_matches_javascript() {
    assert_eq!(
        encode_component("files/தமிழ் !'()*.excalidraw"),
        "files%2F%E0%AE%A4%E0%AE%AE%E0%AE%BF%E0%AE%B4%E0%AF%8D%20!'()*.excalidraw"
    );
}

#[test]
fn null_empty_and_missing_manifest_types_default_to_fountain() {
    for manifest in [
        r#"[{"name":"Main","file":"files/main.fountain","type":null}]"#,
        r#"[{"name":"Main","file":"files/main.fountain","type":""}]"#,
        r#"[{"name":"Main","file":"files/main.fountain"}]"#,
    ] {
        let mut zip = ZipWriter::new(Cursor::new(Vec::new()));
        zip.start_file("project.json", SimpleFileOptions::default())
            .unwrap();
        zip.write_all(manifest.as_bytes()).unwrap();
        zip.start_file("files/main.fountain", SimpleFileOptions::default())
            .unwrap();
        zip.write_all(b"Hello").unwrap();
        let bundle = unpack(&zip.finish().unwrap().into_inner(), None).unwrap();
        assert_eq!(bundle.scripts[0].kind, "fountain");
        assert_eq!(bundle.scripts[0].content, "Hello");
    }
}

#[test]
fn canvas_base64_accepts_browser_trailing_bits_but_rejects_broken_data() {
    for encoded in ["Zh==", "Zh", " Z h ==\n"] {
        let script: ScriptInfo = serde_json::from_value(json!({"name":"Canvas","fileName":"files/Canvas.excalidraw","type":"canvas","content":json!({"type":"excalidraw","files":{"a":{"mimeType":"image/png","dataURL":format!("data:image/png;base64,{encoded}")}}}).to_string()})).unwrap();
        let bundle = unpack(&pack(&[script], &Map::new()).unwrap(), None).unwrap();
        let canvas: Value = serde_json::from_str(&bundle.scripts[0].content).unwrap();
        assert_eq!(
            canvas["files"]["a"]["dataURL"],
            "data:image/png;base64,Zg=="
        );
    }
    let script: ScriptInfo = serde_json::from_value(json!({"name":"Canvas","fileName":"files/Canvas.excalidraw","type":"canvas","content":json!({"type":"excalidraw","files":{"a":{"dataURL":"data:image/png;base64,%%%"}}}).to_string()})).unwrap();
    assert!(pack(&[script], &Map::new()).is_err());
}

#[test]
fn prose_images_are_archived_and_restored_without_external_files() {
    let content = "Before\n\n![Reference](data:image/png;base64,YQ==)\n\nAfter";
    let script: ScriptInfo = serde_json::from_value(json!({"name":"Notes","fileName":"files/Notes.md","type":"markdown","content":content})).unwrap();
    let bytes = pack(&[script], &Map::new()).unwrap();
    let mut archive = ZipArchive::new(Cursor::new(&bytes[4..])).unwrap();
    let mut markdown = String::new();
    archive.by_name("files/Notes.md").unwrap().read_to_string(&mut markdown).unwrap();
    assert!(markdown.contains("actone-image:assets/prose/files%2FNotes.md/0.png"));
    assert!(!markdown.contains("base64"));
    let bundle = unpack(&bytes, None).unwrap();
    assert_eq!(bundle.scripts[0].content, content);
}
#[test]
fn missing_prose_image_fails_without_silent_loss() {
    assert!(restore_prose("![x](actone-image:assets/prose/missing.png)", &Entries::new()).unwrap_err().contains("Missing prose image"));
}
#[test]
fn prose_image_types_and_invalid_data() {
    for mime in ["png", "jpeg", "webp"] {
        let content = format!("![x](data:image/{mime};base64,YQ==)");
        let mut entries = Entries::new();
        let packed = pack_prose(&content, "files/Notes.md", &mut entries).unwrap();
        assert_eq!(restore_prose(&packed, &entries).unwrap(), content);
    }
    assert!(pack_prose("![x](data:image/png;base64,=)", "notes", &mut Entries::new()).is_err());
}

#[test]
fn short_prose_references_roundtrip_with_registry_and_recovery_assets() {
    let script: ScriptInfo = serde_json::from_value(json!({"name":"Notes","fileName":"files/Notes.md","type":"markdown","content":"![image1](image1)"})).unwrap();
    let settings = json!({"proseImages":{"image1":"data:image/png;base64,YQ==","image2":"data:image/jpeg;base64,Yg=="}}).as_object().unwrap().clone();
    let bytes = pack(&[script.clone()], &settings).unwrap();
    let restored = unpack(&bytes, None).unwrap();
    assert_eq!(restored.scripts[0].content, script.content);
    assert_eq!(restored.settings["proseImages"], json!({"image1":"data:image/png;base64,YQ=="}));
    assert!(settings["proseImages"].get("image2").is_some());
    assert!(pack(&[script], &Map::new()).unwrap_err().contains("Missing prose image"));
}
#[test]
fn short_prose_registry_missing_asset_is_an_error() {
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    writer.start_file("settings.json", SimpleFileOptions::default()).unwrap();
    writer.write_all(br#"{"proseImages":{"image1":"actone-image:assets/prose/image1.png"}}"#).unwrap();
    let bytes = writer.finish().unwrap().into_inner();
    assert!(unpack(&bytes, None).unwrap_err().contains("Missing prose image"));
}

#[test]
fn save_omits_unused_prose_images_but_keeps_other_document_references() {
    let script: ScriptInfo = serde_json::from_value(json!({"name":"Notes","fileName":"files/Notes.md","type":"markdown","content":"No images"})).unwrap();
    let mut second = script.clone(); second.file_name = "files/Other.md".into(); second.content = "![image2](image2)".into();
    let settings = json!({"proseImages":{"image1":"data:image/png;base64,YQ==","image2":"data:image/png;base64,Yg=="}}).as_object().unwrap().clone();
    let bytes = pack(&[script.clone(), second], &settings).unwrap();
    let mut archive = ZipArchive::new(Cursor::new(&bytes[4..])).unwrap();
    assert!(archive.by_name("assets/prose/image1.png").is_err());
    assert!(archive.by_name("assets/prose/image2.png").is_ok());
    assert_eq!(unpack(&bytes, None).unwrap().settings["proseImages"], json!({"image2":"data:image/png;base64,Yg=="}));
    let no_images = unpack(&pack(&[script], &settings).unwrap(), None).unwrap();
    assert_eq!(no_images.settings["proseImages"], json!({}));
    assert_eq!(settings["proseImages"].as_object().unwrap().len(), 2);
}
