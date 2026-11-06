use super::types::Context;
use serde::{Deserialize, Serialize};
use serde_json::Value;
#[derive(Deserialize)]
pub struct ToolCall {
    pub tool: String,
    #[serde(default)]
    pub args: Value,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneRef {
    pub id: usize,
    pub label: String,
    pub heading: String,
    pub start_line: usize,
    pub end_line: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Source {
    #[serde(flatten)]
    pub reference: SceneRef,
    pub text: String,
    pub location: String,
    pub dialogue: Vec<Dialogue>,
    #[serde(default)]
    pub explicit_label: bool,
}

#[derive(Deserialize)]
pub struct Dialogue {
    pub speaker: String,
    pub line: usize,
    pub text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    pub index_key: Option<String>,
    #[serde(default)]
    pub index_requested: bool,
    pub scenes: Vec<Source>,
    pub focus_ids: Vec<usize>,
    #[serde(default)]
    pub candidate_ids: Vec<usize>,
    pub review: Option<String>,
    pub statistics: Option<Value>,
    pub statistics_category: Option<String>,
}

pub struct Evidence {
    pub text: String,
    pub sources: Vec<SceneRef>,
    pub coverage: String,
}

impl Source {
    pub fn excerpt(&self, offset: usize, limit: usize) -> Evidence {
        let lines: Vec<_> = self.text.split('\n').collect();
        let start = offset.min(lines.len());
        let end = start.saturating_add(limit).min(lines.len());
        let mut reference = self.reference.clone();
        reference.start_line += start;
        reference.end_line = self.reference.start_line + end.saturating_sub(1);
        let coverage = if start == 0 && end == lines.len() {
            "Full scene"
        } else {
            "Excerpt"
        };
        Evidence {
            text: format!(
                "{coverage} · Scene {} · {} · lines {}–{}\n{}",
                reference.label,
                reference.heading,
                reference.start_line,
                reference.end_line,
                lines[start..end].join("\n")
            ),
            sources: if start < end { vec![reference] } else { vec![] },
            coverage: coverage.into(),
        }
    }
}

impl Reading {
    fn scene(&self, id: usize) -> Result<&Source, String> {
        self.scenes
            .iter()
            .find(|scene| scene.reference.id == id)
            .ok_or_else(|| "Scene is outside the approved screenplay or could not be found.".into())
    }

    pub fn focus(&self) -> Result<Vec<&Source>, String> {
        self.focus_ids.iter().map(|id| self.scene(*id)).collect()
    }

    pub fn candidates(&self) -> impl Iterator<Item = &Source> {
        self.candidate_ids
            .iter()
            .filter_map(|id| self.scene(*id).ok())
    }

    pub fn statistics(
        &self,
        category: &str,
        sort: &str,
        query: &str,
        offset: usize,
    ) -> Result<Evidence, String> {
        let data = self
            .statistics
            .as_ref()
            .ok_or("Screenplay statistics are unavailable.")?;
        let query = query.to_lowercase();
        let mut items = match category {
            "overview" => vec![data["overview"].clone()],
            "dialogue" => vec![data["longestSpeech"].clone()],
            "scenes" | "characters" | "locations" | "connections" => {
                data[category].as_array().cloned().unwrap_or_default()
            }
            "xray" => data["findings"].as_array().cloned().unwrap_or_default(),
            _ => return Err(
                "Choose overview, dialogue, scenes, characters, locations, connections, or xray."
                    .into(),
            ),
        };
        if !query.is_empty() {
            items.retain(|item| {
                [
                    "name",
                    "heading",
                    "label",
                    "title",
                    "detail",
                    "character",
                    "names",
                ]
                .iter()
                .any(|key| item[*key].to_string().to_lowercase().contains(&query))
            });
        }
        if category == "scenes" {
            let sort = match sort {
                "words" | "dialogueWords" | "actionWords" | "readingSeconds" => sort,
                _ => "pages",
            };
            items.sort_by_key(|item| {
                std::cmp::Reverse((
                    item[sort].as_u64().unwrap_or(0),
                    item["words"].as_u64().unwrap_or(0),
                ))
            });
        }
        let total = items.len();
        let page: Vec<_> = items.into_iter().skip(offset).take(8).collect();
        let sources = page
            .iter()
            .filter_map(|item| {
                let source = self.scene(item["id"].as_u64()? as usize).ok()?;
                Some(source.reference.clone())
            })
            .collect();
        let tail = if offset.saturating_add(8) < total {
            format!(" More results at offset {}.", offset + 8)
        } else {
            String::new()
        };
        Ok(Evidence {
            text: format!(
                "Computed screenplay statistics ({category}), {total} results.{tail} Scene page spans count pages touched, which can be shared with other scenes. Reading time is an estimate.\n{}",
                serde_json::to_string(&page).map_err(|error| error.to_string())?
            ),
            sources,
            coverage: "Computed from the live screenplay".into(),
        })
    }

    fn scene_label(&self, label: &str) -> Result<&Source, String> {
        let has_explicit = self.scenes.iter().any(|scene| scene.explicit_label);
        let mut matches = self.scenes.iter().filter(|scene| {
            (!has_explicit || scene.explicit_label)
                && scene.reference.label.eq_ignore_ascii_case(label)
        });
        match (matches.next(), matches.next()) {
            (Some(scene), None) => Ok(scene),
            (Some(_), Some(_)) => {
                Err("That scene label is ambiguous. Use find_scenes and pass its scene ID.".into())
            }
            _ => Err("That scene label was not found.".into()),
        }
    }

    pub fn execute(&self, call: &ToolCall) -> Result<Evidence, String> {
        let args = call
            .args
            .as_object()
            .ok_or("Tool arguments must be an object.")?;
        let offset = args.get("offset").and_then(Value::as_u64).unwrap_or(0) as usize;
        let page_size = 12;
        match call.tool.as_str() {
            "get_screenplay_stats" => self.statistics(
                args.get("category")
                    .and_then(Value::as_str)
                    .unwrap_or("overview"),
                args.get("sortBy")
                    .and_then(Value::as_str)
                    .unwrap_or("pages"),
                args.get("query").and_then(Value::as_str).unwrap_or(""),
                offset,
            ),
            "read_scene" | "read_scenes" | "compare_scenes" => {
                let selected = if let Some(label) = args.get("label").and_then(Value::as_str) {
                    vec![self.scene_label(label)?]
                } else if let Some(id) = args.get("id").and_then(Value::as_u64) {
                    vec![self.scene(id as usize)?]
                } else if let Some(ids) = args.get("ids").and_then(Value::as_array) {
                    if ids.is_empty() || ids.len() > 4 {
                        return Err("Provide one to four scene IDs.".into());
                    }
                    ids.iter()
                        .map(|id| self.scene(id.as_u64().ok_or("Invalid scene ID.")? as usize))
                        .collect::<Result<Vec<_>, _>>()?
                } else {
                    return Err(
                        "Provide a displayed scene label or an ID returned by find_scenes.".into(),
                    );
                };
                let limit = args
                    .get("lines")
                    .and_then(Value::as_u64)
                    .map_or(usize::MAX, |n| n.clamp(1, 200) as usize);
                let mut text = Vec::new();
                let mut sources = Vec::new();
                let mut full = true;
                for scene in selected {
                    let result = scene.excerpt(offset, limit);
                    if result.sources.is_empty() {
                        return Err("That line offset is past the end of the scene.".into());
                    }
                    full &= result.coverage == "Full scene";
                    text.push(result.text);
                    sources.extend(result.sources);
                }
                Ok(Evidence {
                    text: text.join("\n\n"),
                    sources,
                    coverage: if full { "Full scenes" } else { "Excerpts" }.into(),
                })
            }
            "find_scenes" | "search_script" | "search_dialogue" => {
                let query = args
                    .get("query")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .trim()
                    .to_lowercase();
                let speaker = args
                    .get("speaker")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .trim()
                    .to_lowercase();
                if query.is_empty() && (speaker.is_empty() || call.tool != "search_dialogue") {
                    return Err("Provide a search query or a dialogue speaker.".into());
                }
                let mut matches = Vec::new();
                let before = args.get("beforeId").and_then(Value::as_u64);
                let after = args.get("afterId").and_then(Value::as_u64);
                for scene in &self.scenes {
                    let id = scene.reference.id as u64;
                    if before.is_some_and(|bound| id >= bound)
                        || after.is_some_and(|bound| id <= bound)
                    {
                        continue;
                    }
                    match call.tool.as_str() {
                        "find_scenes" => {
                            if scene.reference.heading.to_lowercase().contains(&query)
                                || scene.location.to_lowercase().contains(&query)
                                || scene.reference.label.to_lowercase() == query
                            {
                                matches.push((
                                    scene,
                                    scene.reference.start_line,
                                    scene.reference.heading.as_str(),
                                ));
                            }
                        }
                        "search_dialogue" => {
                            matches.extend(
                                scene
                                    .dialogue
                                    .iter()
                                    .filter(|line| {
                                        (speaker.is_empty()
                                            || line.speaker.to_lowercase() == speaker)
                                            && line.text.to_lowercase().contains(&query)
                                    })
                                    .map(|line| (scene, line.line, line.text.as_str())),
                            );
                        }
                        _ => matches.extend(
                            scene
                                .text
                                .split('\n')
                                .enumerate()
                                .filter(|(_, text)| text.to_lowercase().contains(&query))
                                .map(|(index, text)| {
                                    (scene, scene.reference.start_line + index, text)
                                }),
                        ),
                    }
                }
                let total = matches.len();
                let mut text = format!(
                    "{total} matches in the current screenplay. Results show matching lines or headings only."
                );
                let mut sources = Vec::new();
                for (scene, line, value) in matches.into_iter().skip(offset).take(page_size) {
                    text.push_str(&format!(
                        "\nScene {} (ID {}), line {}: {}",
                        scene.reference.label, scene.reference.id, line, value
                    ));
                    let mut reference = scene.reference.clone();
                    reference.start_line = line;
                    reference.end_line = line;
                    sources.push(reference);
                }
                if offset.saturating_add(page_size) < total {
                    text.push_str(&format!(
                        "\nMore results available. Use offset {}.",
                        offset + page_size
                    ));
                }
                Ok(Evidence {
                    text,
                    sources,
                    coverage: "Matching lines or headings".into(),
                })
            }
            _ => Err("Unknown read tool.".into()),
        }
    }
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
    fn reading() -> Reading {
        serde_json::from_value(json!({
            "scenes": [
                {"id":67,"label":"67","heading":"INT. OTHER - DAY","startLine":5,"endLine":6,
                 "text":"INT. OTHER - DAY\nAn ordinal collision.", "location":"OTHER","dialogue":[]},
                {"id":72,"label":"67","heading":"EXT. RIVER - NIGHT #67#","startLine":10,"endLine":13,
                 "text":"EXT. RIVER - NIGHT #67#\nMAYA\nI found the letter.\nShe hides it.",
                 "explicitLabel":true,"location":"RIVER","dialogue":[{"speaker":"MAYA","line":12,"text":"I found the letter."}]},
                {"id":73,"label":"67A","heading":"EXT. ROAD - NIGHT #67A#","startLine":14,"endLine":15,
                 "text":"EXT. ROAD - NIGHT #67A#\nMaya leaves.","explicitLabel":true,"location":"ROAD","dialogue":[]}
            ],
            "focusIds":[72],
            "statistics":{"scenes":[{"id":73,"pages":1,"words":100},{"id":72,"pages":2,"words":50}]}
        })).unwrap()
    }

    #[test]
    fn numeric_labels_only_fall_back_in_unnumbered_drafts() {
        let mut reading = reading();
        reading.scenes[0].reference.label = "1".into();
        assert!(reading.scene_label("1").is_err());
        for scene in &mut reading.scenes {
            scene.explicit_label = false;
        }
        assert_eq!(reading.scene_label("1").unwrap().reference.id, 67);
    }

    #[test]
    fn reads_original_text_by_displayed_label_and_can_compare_live_scenes() {
        let reading = reading();
        let execute = |tool: &str, args| {
            reading.execute(&ToolCall {
                tool: tool.into(),
                args,
            })
        };
        let exact = execute("read_scene", json!({"label":"67"})).unwrap();
        assert_eq!(exact.sources[0].id, 72);
        assert!(exact.text.contains("I found the letter.\nShe hides it."));
        assert!(!exact.text.contains("ordinal collision"));
        let page = execute("read_scene", json!({"id":72,"offset":2,"lines":1})).unwrap();
        assert_eq!(page.sources[0].start_line, 12);
        assert_eq!(page.sources[0].end_line, 12);
        assert_eq!(page.coverage, "Excerpts");
        let compare = execute("compare_scenes", json!({"ids":[72,73]})).unwrap();
        assert!(compare.text.contains("Maya leaves."));
        assert_eq!(compare.sources.len(), 2);
        assert!(execute("read_scene", json!({"id":99})).is_err());
        assert!(execute("replace_scene", json!({"id":72,"text":"Injected"})).is_err());
    }

    #[test]
    fn distinguishes_dialogue_from_mentions_and_searches_beyond_the_initial_scene() {
        let reading = reading();
        let execute = |tool: &str, args| {
            reading
                .execute(&ToolCall {
                    tool: tool.into(),
                    args,
                })
                .unwrap()
        };
        let dialogue = execute(
            "search_dialogue",
            json!({"speaker":"Maya","query":"letter"}),
        );
        assert_eq!(dialogue.sources[0].start_line, 12);
        assert!(!dialogue.text.contains("Maya leaves"));
        let hits = execute("search_script", json!({"query":"Maya","afterId":72}));
        assert_eq!(hits.sources[0].id, 73);
        let location = execute("find_scenes", json!({"query":"road"}));
        assert_eq!(location.sources[0].id, 73);
        let stats = execute("get_screenplay_stats", json!({"category":"scenes"}));
        assert_eq!(stats.sources[0].id, 72);
        let words = execute(
            "get_screenplay_stats",
            json!({"category":"scenes","sortBy":"words"}),
        );
        assert_eq!(words.sources[0].id, 73);
    }
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
