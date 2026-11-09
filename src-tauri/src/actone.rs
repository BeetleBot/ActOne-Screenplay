//! Version-4 project codec. Keep legacy shapes compatible with the browser codec.
use base64::{Engine, engine::general_purpose::STANDARD};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::BTreeMap;
use std::io::{Cursor, Read, Write};
use zip::{ZipArchive, ZipWriter, write::SimpleFileOptions};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScriptInfo {
    #[serde(
        default = "fountain",
        deserialize_with = "nullable_kind",
        rename = "type"
    )]
    pub kind: String,
    pub name: String,
    pub file_name: String,
    pub content: String,
    #[serde(default)]
    pub saved_content: String,
}
fn nullable_kind<'de, D: serde::Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    Ok(Option::<String>::deserialize(d)?
        .filter(|s| !s.is_empty())
        .unwrap_or_else(fountain))
}
fn fountain() -> String {
    "fountain".into()
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Bundle {
    pub scripts: Vec<ScriptInfo>,
    pub settings: Map<String, Value>,
    pub prompt_chats: Value,
    pub is_legacy: bool,
}
#[derive(Deserialize)]
struct ManifestEntry {
    name: String,
    file: String,
    #[serde(
        default = "fountain",
        deserialize_with = "nullable_kind",
        rename = "type"
    )]
    kind: String,
}
type Entries = BTreeMap<String, Vec<u8>>;

fn truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::String(s) => !s.is_empty(),
        Value::Number(n) => n.as_f64() != Some(0.0),
        _ => true,
    }
}
fn optional(entries: &Entries, key: &str, fallback: Value) -> Value {
    entries
        .get(key)
        .and_then(|b| serde_json::from_slice(b).ok())
        .unwrap_or(fallback)
}
fn text(entries: &Entries, key: &str) -> String {
    entries
        .get(key)
        .map(|b| String::from_utf8_lossy(b).into_owned())
        .unwrap_or_default()
}
fn distribute(scripts: &[ScriptInfo], v: &Value) -> Value {
    Value::Object(
        scripts
            .iter()
            .map(|s| (s.file_name.clone(), v.clone()))
            .collect(),
    )
}

/// Archives are decoded in memory only; entry paths are never extracted to disk.
pub fn unpack(bytes: &[u8], bundle_name: Option<&str>) -> Result<Bundle, String> {
    let bytes = bytes
        .strip_prefix(b"ACT1")
        .or_else(|| bytes.strip_suffix(b"ACT1"))
        .unwrap_or(bytes);
    let mut zip =
        ZipArchive::new(Cursor::new(bytes)).map_err(|e| format!("Invalid ActOne archive: {e}"))?;
    let mut entries = Entries::new();
    let mut order = Vec::new();
    for i in 0..zip.len() {
        let mut file = zip.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().to_owned();
        let mut data = Vec::new();
        file.read_to_end(&mut data).map_err(|e| e.to_string())?;
        if !entries.contains_key(&name) {
            order.push(name.clone());
        }
        entries.insert(name, data);
    }
    let mut settings = optional(&entries, "settings.json", json!({}))
        .as_object()
        .cloned()
        .unwrap_or_default();
    settings.shift_remove("assets");
    if let Some(Value::Object(images)) = settings.get_mut("proseImages") {
        for (name, value) in images.iter_mut() {
            if !valid_image_name(name) { return Err("Invalid prose image name".into()); }
            let url = value.as_str().ok_or("Invalid prose image reference")?;
            let restored = restore_prose(&format!("![{name}]({url})"), &entries)?;
            let captures = prose_pattern().captures(&restored).ok_or("Invalid prose image reference")?;
            if !captures[2].starts_with("data:image/") { return Err("Missing prose image bytes".into()); }
            *value = json!(&captures[2]);
        }
    }
    let chats = optional(
        &entries,
        "urai.json",
        optional(
            &entries,
            "muse.json",
            optional(
                &entries,
                "prompt.json",
                json!({"conversations":[],"activeConversationId":null}),
            ),
        ),
    );
    settings.insert(
        "sprintHistory".into(),
        optional(&entries, "sprint_data.json", json!([])),
    );
    settings.insert("promptChats".into(), chats.clone());
    let mut migrations = BTreeMap::new();
    let mut scripts = Vec::new();
    if let Some(manifest_key) = ["project.json", "fountain.json"]
        .into_iter()
        .find(|k| entries.contains_key(*k))
    {
        let manifest: Vec<ManifestEntry> = serde_json::from_slice(&entries[manifest_key])
            .map_err(|e| format!("Invalid {manifest_key}: {e}"))?;
        for entry in manifest {
            let path = if entry.file.starts_with("files/") {
                entry.file.clone()
            } else {
                format!("files/{}", entry.file)
            };
            if path != entry.file {
                migrations.insert(entry.file.clone(), path.clone());
            }
            let content = if manifest_key == "project.json" {
                let key = if entries.contains_key(&entry.file) {
                    &entry.file
                } else {
                    &path
                };
                restore_canvas(&text(&entries, key), &entries)?
            } else {
                text(&entries, &entry.file)
            };
            scripts.push(ScriptInfo {
                name: entry.name,
                file_name: path,
                kind: if manifest_key == "fountain.json" || entry.kind.is_empty() {
                    fountain()
                } else {
                    entry.kind
                },
                saved_content: content.clone(),
                content,
            });
        }
    } else {
        let key = if entries.contains_key("document.fountain") {
            "document.fountain"
        } else {
            order
                .iter()
                .find(|k| {
                    k.ends_with(".fountain") || k.ends_with(".md") || k.ends_with(".markdown")
                })
                .map(String::as_str)
                .unwrap_or("document.fountain")
        };
        let inferred = key
            .rsplit('/')
            .next()
            .unwrap_or(key)
            .rsplit_once('.')
            .map(|(s, _)| s)
            .unwrap_or(key);
        let name = bundle_name
            .filter(|s| !s.is_empty())
            .unwrap_or(if key == "document.fountain" {
                "Untitled"
            } else {
                inferred
            });
        let prose = key.ends_with(".md") || key.ends_with(".markdown");
        let path = format!("files/{name}.{}", if prose { "md" } else { "fountain" });
        migrations.insert(key.to_owned(), path.clone());
        let content = text(&entries, key);
        scripts.push(ScriptInfo {
            name: name.into(),
            file_name: path,
            kind: if prose { "markdown".into() } else { fountain() },
            saved_content: content.clone(),
            content,
        });
    }
    if scripts.is_empty() {
        let name = bundle_name.filter(|s| !s.is_empty()).unwrap_or("Untitled");
        scripts.push(ScriptInfo {
            name: name.into(),
            file_name: format!("files/{name}.fountain"),
            kind: fountain(),
            content: String::new(),
            saved_content: String::new(),
        });
    }
    let genders = optional(&entries, "characters.json", json!({}));
    for (key, entry, default) in [
        ("notepad", "notepad.json", json!("")),
        ("todos", "todos.json", json!([])),
        ("parking", "parking.json", json!([])),
        ("genders", "characters.json", json!({})),
    ] {
        let value = optional(&entries, entry, default);
        let value = if scripts.len() > 1 {
            if key == "genders" && value.is_object() {
                if scripts.iter().any(|s| value.get(&s.file_name).is_some()) {
                    value
                } else if truthy(&genders["genders"]) {
                    distribute(&scripts, &genders["genders"])
                } else {
                    value
                }
            } else if value.is_object() {
                value
            } else {
                distribute(&scripts, &value)
            }
        } else if key == "genders" && truthy(&genders["genders"]) {
            genders["genders"].clone()
        } else {
            value
        };
        let value = if let Some(obj) = value.as_object() {
            Value::Object(
                obj.iter()
                    .map(|(k, v)| (migrations.get(k).unwrap_or(k).clone(), v.clone()))
                    .collect(),
            )
        } else {
            value
        };
        settings.insert(key.into(), value);
    }
    Ok(Bundle {
        scripts,
        settings,
        prompt_chats: chats,
        is_legacy: !migrations.is_empty() || !entries.contains_key("format.json"),
    })
}

fn encode_component(s: &str) -> String {
    s.bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&b) {
                (b as char).to_string()
            } else {
                format!("%{b:02X}")
            }
        })
        .collect()
}
fn pack_canvas(script: &ScriptInfo, entries: &mut Entries) -> Result<String, String> {
    if script.kind == "markdown" { return pack_prose(&script.content, &script.file_name, entries); }
    if script.kind != "canvas" {
        return Ok(script.content.clone());
    }
    let Ok(mut data) = serde_json::from_str::<Value>(&script.content) else {
        return Ok(script.content.clone());
    };
    if data["type"] != "excalidraw" {
        return Ok(script.content.clone());
    }
    if let Some(files) = data["files"].as_object_mut() {
        for (id, asset) in files {
            let Some(url) = asset.get("dataURL").and_then(Value::as_str) else {
                continue;
            };
            let Some((mime, encoded)) = url
                .strip_prefix("data:")
                .and_then(|s| s.split_once(";base64,"))
            else {
                continue;
            };
            if mime.is_empty() || mime.contains([',', ';']) {
                continue;
            }
            // Browser atob accepts unpadded input and ASCII whitespace.
            let encoded: String = encoded
                .chars()
                .filter(|c| !c.is_ascii_whitespace())
                .collect();
            let decoder = base64::engine::GeneralPurpose::new(
                &base64::alphabet::STANDARD,
                base64::engine::general_purpose::GeneralPurposeConfig::new()
                    .with_decode_padding_mode(base64::engine::DecodePaddingMode::Indifferent)
                    .with_decode_allow_trailing_bits(true),
            );
            let bytes = decoder
                .decode(encoded)
                .map_err(|e| format!("Invalid Canvas image: {e}"))?;
            let path = format!(
                "assets/{}/{}",
                encode_component(&script.file_name),
                encode_component(id)
            );
            entries.insert(path.clone(), bytes);
            if let Some(obj) = asset.as_object_mut() {
                obj.shift_remove("dataURL");
                obj.insert("actoneAsset".into(), json!(path));
            }
        }
    }
    serde_json::to_string(&data).map_err(|e| e.to_string())
}
fn restore_canvas(content: &str, entries: &Entries) -> Result<String, String> {
    let restored = restore_prose(content, entries)?;
    let content = restored.as_str();
    let Ok(mut data) = serde_json::from_str::<Value>(content) else {
        return Ok(content.into());
    };
    if data["type"] != "excalidraw" {
        return Ok(content.into());
    }
    let mut changed = false;
    if let Some(files) = data["files"].as_object_mut() {
        for asset in files.values_mut() {
            let Some(path) = asset
                .get("actoneAsset")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
            else {
                continue;
            };
            let bytes = entries
                .get(path)
                .ok_or_else(|| format!("Missing Canvas image: {path}"))?;
            let mime = asset
                .get("mimeType")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
                .unwrap_or("application/octet-stream");
            let url = format!("data:{mime};base64,{}", STANDARD.encode(bytes));
            if let Some(obj) = asset.as_object_mut() {
                obj.shift_remove("actoneAsset");
                obj.insert("dataURL".into(), json!(url));
            }
            changed = true;
        }
    }
    if changed {
        serde_json::to_string(&data).map_err(|e| e.to_string())
    } else {
        Ok(content.into())
    }
}

pub fn pack(scripts: &[ScriptInfo], settings: &Map<String, Value>) -> Result<Vec<u8>, String> {
    let mut rest = settings.clone();
    for k in [
        "genders",
        "todos",
        "parking",
        "notepad",
        "sprintHistory",
        "promptChats",
    ] {
        rest.shift_remove(k);
    }
    let mut entries = Entries::new();
    let reference_pattern = regex::Regex::new(r"!\[[^\]\n]*\]\((image[1-9][0-9]*)\)").unwrap();
    let used_images: std::collections::BTreeSet<String> = scripts.iter()
        .filter(|script| script.kind == "markdown")
        .flat_map(|script| reference_pattern.captures_iter(&script.content).map(|caps| caps[1].to_string()).collect::<Vec<_>>())
        .collect();
    if let Some(Value::Object(images)) = rest.get_mut("proseImages") {
        images.retain(|name, _| used_images.contains(name));
        for (name, value) in images.iter_mut() {
            if !valid_image_name(name) { return Err("Invalid prose image name".into()); }
            let url = value.as_str().ok_or("Invalid prose image data")?;
            let captures = prose_pattern().captures(&format!("![{name}]({url})")).map(|c| c[2].to_string()).ok_or("Invalid prose image data")?;
            let (prefix, encoded) = captures.split_once(',').ok_or("Invalid prose image data")?;
            let ext = if prefix.contains("jpeg") { "jpg" } else if prefix.contains("webp") { "webp" } else { "png" };
            let path = format!("assets/prose/{name}.{ext}");
            entries.insert(path.clone(), STANDARD.decode(encoded).map_err(|e| format!("Invalid prose image: {e}"))?);
            *value = json!(format!("actone-image:{path}"));
        }
    }
    let manifest: Vec<Value> = scripts.iter().map(|s| json!({"name":s.name,"file":s.file_name,"type":if s.kind.is_empty() {"fountain"} else {&s.kind}})).collect();
    let mut put = |key: &str, value: Value| -> Result<(), String> {
        entries.insert(
            key.into(),
            serde_json::to_vec_pretty(&value).map_err(|e| e.to_string())?,
        );
        Ok(())
    };
    put("format.json", json!({"version":4}))?;
    put("project.json", json!(manifest))?;
    put("settings.json", json!(rest))?;
    for (key, entry, default) in [
        ("sprintHistory", "sprint_data.json", json!([])),
        (
            "promptChats",
            "urai.json",
            json!({"conversations":[],"activeConversationId":null}),
        ),
        ("genders", "characters.json", json!({})),
        ("todos", "todos.json", json!([])),
        ("parking", "parking.json", json!([])),
        ("notepad", "notepad.json", json!("")),
    ] {
        let supplied = settings.get(key);
        let value = supplied
            .filter(|v| truthy(v))
            .cloned()
            .unwrap_or(default.clone());
        let value = if scripts.len() > 1
            && ["genders", "todos", "parking", "notepad"].contains(&key)
        {
            // JS serializes undefined metadata as an empty entry; the reader uses its default.
            if supplied.is_none() {
                entries.insert(entry.into(), Vec::new());
                continue;
            }
            let value = supplied.cloned().unwrap_or(Value::Null);
            if !truthy(&value) {
                value
            } else if value.is_object() && scripts.iter().any(|s| value.get(&s.file_name).is_some())
            {
                Value::Object(
                    scripts
                        .iter()
                        .map(|s| {
                            (
                                s.file_name.clone(),
                                value
                                    .get(&s.file_name)
                                    .filter(|v| !v.is_null())
                                    .cloned()
                                    .unwrap_or(default.clone()),
                            )
                        })
                        .collect(),
                )
            } else {
                distribute(scripts, &value)
            }
        } else if key == "genders"
            && supplied.is_some_and(Value::is_object)
            && !scripts.iter().any(|s| value.get(&s.file_name).is_some())
        {
            json!({"genders":value})
        } else {
            value
        };
        entries.insert(
            entry.into(),
            serde_json::to_vec_pretty(&value).map_err(|e| e.to_string())?,
        );
    }
    for script in scripts {
        // Duplicate/reserved paths would silently overwrite project data.
        if entries.contains_key(&script.file_name) || script.file_name.is_empty() {
            return Err(format!(
                "Duplicate or reserved document path: {}",
                script.file_name
            ));
        }
        if script.kind == "markdown" {
            let pattern = regex::Regex::new(r"!\[[^\]\n]*\]\((image[1-9][0-9]*)\)").unwrap();
            for caps in pattern.captures_iter(&script.content) {
                if settings.get("proseImages").and_then(|v| v.get(&caps[1])).is_none() {
                    return Err(format!("Missing prose image: {}", &caps[1]));
                }
            }
        }
        let content = pack_canvas(script, &mut entries)?;
        entries.insert(script.file_name.clone(), content.into_bytes());
    }
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    for (name, bytes) in entries {
        writer
            .start_file(
                name,
                SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated),
            )
            .map_err(|e| e.to_string())?;
        writer.write_all(&bytes).map_err(|e| e.to_string())?;
    }
    let zipped = writer.finish().map_err(|e| e.to_string())?.into_inner();
    let mut result = b"ACT1".to_vec();
    result.extend(zipped);
    Ok(result)
}

#[tauri::command]
pub async fn read_actone_bundle(
    path: String,
    bundle_name: Option<String>,
) -> Result<Bundle, String> {
    tauri::async_runtime::spawn_blocking(move || {
        unpack(
            &std::fs::read(std::path::Path::new(&path)).map_err(|e| e.to_string())?,
            bundle_name.as_deref(),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn unpack_actone_bundle(
    bytes: Vec<u8>,
    bundle_name: Option<String>,
) -> Result<Bundle, String> {
    tauri::async_runtime::spawn_blocking(move || unpack(&bytes, bundle_name.as_deref()))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn pack_actone_bundle(
    scripts: Vec<ScriptInfo>,
    settings: Map<String, Value>,
) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || pack(&scripts, &settings))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn save_actone_bundle(
    path: String,
    scripts: Vec<ScriptInfo>,
    settings: Map<String, Value>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        save(std::path::Path::new(&path), &scripts, &settings)
    })
    .await
    .map_err(|e| e.to_string())?
}

pub fn save(
    path: &std::path::Path,
    scripts: &[ScriptInfo],
    settings: &Map<String, Value>,
) -> Result<(), String> {
    let bytes = pack(scripts, settings)?;
    crate::write_file_atomically(path, bytes)
}

#[cfg(test)]
mod tests;

fn prose_pattern() -> regex::Regex {
    regex::Regex::new(r"!\[([^\]\n]*)\]\((data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+|actone-image:assets/prose/[A-Za-z0-9%._/-]+)\)").unwrap()
}
pub(crate) fn pack_prose(content: &str, file_name: &str, entries: &mut BTreeMap<String, Vec<u8>>) -> Result<String, String> {
    let mut error = None;
    let mut index = 0;
    let result = prose_pattern().replace_all(content, |caps: &regex::Captures| {
        let url = &caps[2];
        let Some((prefix, encoded)) = url.split_once(',') else { error = Some("Unresolved prose image".to_string()); return caps[0].to_string(); };
        let ext = if prefix.contains("jpeg") { "jpg" } else if prefix.contains("webp") { "webp" } else { "png" };
        match STANDARD.decode(encoded) {
            Ok(bytes) => {
                let path = format!("assets/prose/{}/{index}.{ext}", encode_component(file_name));
                index += 1;
                entries.insert(path.clone(), bytes);
                format!("![{}](actone-image:{path})", &caps[1])
            }
            Err(e) => { error = Some(format!("Invalid prose image: {e}")); caps[0].to_string() }
        }
    }).into_owned();
    if let Some(error) = error { Err(error) } else { Ok(result) }
}
fn restore_prose(content: &str, entries: &Entries) -> Result<String, String> {
    let mut missing = None;
    let result = prose_pattern().replace_all(content, |caps: &regex::Captures| {
        let Some(path) = caps[2].strip_prefix("actone-image:") else { return caps[0].to_string(); };
        match entries.get(path) {
            Some(bytes) => {
                let mime = if path.ends_with(".jpg") { "image/jpeg" } else if path.ends_with(".webp") { "image/webp" } else { "image/png" };
                format!("![{}](data:{mime};base64,{})", &caps[1], STANDARD.encode(bytes))
            }
            None => { missing = Some(format!("Missing prose image: {path}")); caps[0].to_string() }
        }
    }).into_owned();
    if let Some(error) = missing { Err(error) } else { Ok(result) }
}

fn valid_image_name(name: &str) -> bool {
    name.strip_prefix("image").is_some_and(|suffix| !suffix.is_empty() && !suffix.starts_with('0') && suffix.bytes().all(|b| b.is_ascii_digit()))
}
