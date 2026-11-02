//! Test-only reference rules for metadata/revisions. Production React state stays
//! in TypeScript; these are compatibility references, not migrated runtime code.
use serde_json::{Value, json};

fn undefined() -> Value {
    json!({"$undefined":true})
}
fn missing(v: &Value) -> bool {
    v.is_null() || v == &undefined()
}
fn object(v: &Value) -> bool {
    v.is_object() && v != &undefined()
}
const KEYED: [&str; 5] = [
    "notepad",
    "todos",
    "parking",
    "genders",
    "characterProfiles",
];

pub fn setting(key: &str, settings: &Value, file: &str) -> Value {
    let v = settings.get(key).cloned().unwrap_or_else(undefined);
    if missing(&v) || file.is_empty() || !object(&v) {
        return v;
    }
    if v.get(file).is_some()
        || v.as_object()
            .is_some_and(|o| o.keys().any(|k| k.ends_with(".fountain")))
        || KEYED.contains(&key)
    {
        v.get(file).cloned().unwrap_or_else(undefined)
    } else {
        v
    }
}

pub fn migrate_settings(settings: &Value, old: &str, new: Option<&str>) -> Value {
    if missing(settings) {
        return json!({});
    }
    if !object(settings) || old.is_empty() || new == Some(old) || new == Some("") {
        return settings.clone();
    }
    let mut result = settings.clone();
    for k in KEYED {
        if let Some(map) = result.get_mut(k).and_then(Value::as_object_mut) {
            if let Some(v) = map.remove(old) {
                if let Some(new) = new {
                    map.insert(new.into(), v);
                }
            }
        }
    }
    result
}

pub fn update_setting(previous: &Value, key: &str, file: &str, value: &Value) -> Value {
    if file.is_empty() {
        return json!({key:value});
    }
    let mut map = previous
        .get(key)
        .filter(|v| object(v))
        .cloned()
        .unwrap_or(json!({}));
    map[file] = value.clone();
    json!({key:map})
}

/// A completed write acknowledges the captured revision, never subsequent edits.
pub fn acknowledge(current: &Value, snapshot: &Value, written: Option<&Value>) -> Value {
    let mut result = current.clone();
    let scripts = written.and_then(Value::as_array).map(|written| {
        let source = current
            .get("scripts")
            .and_then(Value::as_array)
            .filter(|s| !s.is_empty())
            .unwrap_or(written);
        source
            .iter()
            .map(|script| {
                let mut script = script.clone();
                if let Some(saved) = written.iter().find(|s| s["fileName"] == script["fileName"]) {
                    script["savedContent"] = saved["content"].clone();
                }
                script
            })
            .collect::<Vec<_>>()
    });
    let index = current["activeScriptIndex"].as_u64().unwrap_or(0) as usize;
    let saved_text = scripts
        .as_ref()
        .and_then(|s| s.get(index))
        .and_then(|s| s.get("savedContent"))
        .cloned()
        .unwrap_or_else(|| snapshot["rawText"].clone());
    let structure_changed = scripts.as_ref().is_some_and(|scripts| {
        let written = written.and_then(Value::as_array).expect("written scripts");
        scripts.len() != written.len()
            || scripts
                .iter()
                .zip(written)
                .any(|(s, w)| s["fileName"] != w["fileName"] || s["name"] != w["name"])
    });
    let content_changed = scripts
        .as_ref()
        .map(|s| s.iter().any(|s| s["content"] != s["savedContent"]))
        .unwrap_or(current["rawText"] != snapshot["rawText"]);
    result["scripts"] = scripts.map(Value::Array).unwrap_or_else(undefined);
    result["savedText"] = saved_text;
    result["isDirty"] = json!(
        structure_changed
            || content_changed
            || current["parsedDoc"]["settings"] != snapshot["parsedDoc"]["settings"]
    );
    result
}

#[cfg(test)]
pub fn run_oracle(name: &str, args: &[Value]) -> Value {
    let arg = |i| args.get(i).cloned().unwrap_or_else(undefined);
    let string = |i| args.get(i).and_then(Value::as_str).unwrap_or("");
    match name {
        "migrateSettingsKey" => migrate_settings(&arg(0), string(1), Some(string(2))),
        "removeSettingsKey" => migrate_settings(&arg(0), string(1), None),
        "updatePerScriptSetting" => update_setting(&arg(0), string(1), string(2), &arg(3)),
        "acknowledgeSavedFile" => {
            acknowledge(&arg(0), &arg(1), args.get(2).filter(|v| !missing(v)))
        }
        _ => {
            let v = setting(string(0), &arg(1), string(2));
            let fallback = args.get(3).cloned().unwrap_or_else(|| match name {
                "getPerScriptSettingArray" => json!([]),
                "getPerScriptSettingObject" => json!({}),
                "getPerScriptSettingString" => json!(""),
                "getPerScriptSettingNumber" => json!(0),
                _ => undefined(),
            });
            match name {
                "getPerScriptSettingArray" if !v.is_array() => fallback,
                "getPerScriptSettingObject" if !object(&v) => fallback,
                "getPerScriptSettingString" if !v.is_string() => fallback,
                "getPerScriptSettingNumber" if !v.is_number() => fallback,
                _ => v,
            }
        }
    }
}
