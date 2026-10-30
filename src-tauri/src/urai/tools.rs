use super::types::Context;
use serde::Deserialize;
use serde_json::Value;
#[derive(Deserialize)]
pub struct ToolCall {
    pub tool: String,
    #[serde(default)]
    pub args: Value,
}
pub fn execute(call: &ToolCall, context: &Context) -> Result<String, String> {
    let permitted = context.permitted_text()?;
    let scenes: Vec<_> = context
        .scenes
        .iter()
        .filter(|s| {
            context.scope == "full"
                || (matches!(context.scope.as_str(), "scene" | "scenes")
                    && context.scene_ids.contains(&s.id))
        })
        .collect();
    match call.tool.as_str() {
        "read_scene" => {
            let id = call.args["sceneNumber"]
                .as_u64()
                .ok_or("A scene number is required.")? as usize;
            let scene = scenes
                .iter()
                .find(|s| s.id == id)
                .ok_or("This scene was not shared. Ask the writer to share it.")?;
            Ok(scene.text.clone())
        }
        "search_script" | "search_character_dialogue" => {
            let query = call.args["query"]
                .as_str()
                .filter(|q| !q.is_empty())
                .ok_or("A search query is required.")?
                .to_lowercase();
            let matches: Vec<_> = permitted
                .lines()
                .filter(|line| line.to_lowercase().contains(&query))
                .take(20)
                .collect();
            Ok(if matches.is_empty() {
                "No matches in the shared text.".into()
            } else {
                matches.join("\n")
            })
        }
        "get_character_scenes" | "get_location_breakdown" => {
            let query = call.args["characterName"]
                .as_str()
                .or(call.args["locationName"].as_str())
                .filter(|q| !q.is_empty())
                .ok_or("A character or location is required.")?
                .to_lowercase();
            Ok(scenes
                .iter()
                .filter(|s| s.text.to_lowercase().contains(&query))
                .map(|s| format!("Scene {}: {}", s.id, s.heading))
                .collect::<Vec<_>>()
                .join("\n"))
        }
        "get_screenplay_stats" => Ok(format!(
            "Shared text only: {} words, {} scenes. This is not a count of unshared screenplay content.",
            permitted.split_whitespace().count(),
            scenes.len()
        )),
        "read_active_cursor_context" => Ok(permitted),
        _ => Err("This tool is unavailable. UrAI only reads approved screenplay context.".into()),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::urai::types::Scene;
    use serde_json::json;
    #[test]
    fn tools_cannot_read_unshared_scenes() {
        let c = Context {
            scope: "scene".into(),
            scene_ids: vec![1],
            scenes: vec![
                Scene {
                    id: 1,
                    heading: "Public".into(),
                    text: "Hello JOHN".into(),
                },
                Scene {
                    id: 2,
                    heading: "Secret".into(),
                    text: "PRIVATE".into(),
                },
            ],
            selection: String::new(),
        };
        assert!(
            execute(
                &ToolCall {
                    tool: "read_scene".into(),
                    args: json!({"sceneNumber":2})
                },
                &c
            )
            .is_err()
        );
        let result = execute(
            &ToolCall {
                tool: "search_script".into(),
                args: json!({"query":"PRIVATE"}),
            },
            &c,
        )
        .unwrap();
        assert!(!result.contains("PRIVATE"));
        assert!(
            execute(
                &ToolCall {
                    tool: "replace_scene".into(),
                    args: json!({})
                },
                &c
            )
            .is_err()
        );
    }
}
