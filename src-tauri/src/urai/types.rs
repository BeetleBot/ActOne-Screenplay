use serde::{Deserialize, Serialize};

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub provider: String,
    pub endpoint: String,
    pub model: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default = "default_context")]
    pub context_tokens: usize,
}
fn default_context() -> usize {
    8192
}

#[derive(Clone, Deserialize, Serialize, Debug)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Scene {
    pub id: usize,
    pub heading: String,
    pub text: String,
}

#[derive(Clone, Deserialize, Serialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Context {
    #[serde(default)]
    pub scope: String,
    #[serde(default)]
    pub scenes: Vec<Scene>,
    #[serde(default)]
    pub scene_ids: Vec<usize>,
    #[serde(default)]
    pub selection: String,
}

impl Context {
    /// Select excerpts locally when an explicitly shared screenplay exceeds the prompt budget.
    pub fn fit_screenplay(&mut self, query: &str, budget: usize) -> Result<Option<String>, String> {
        if self.scope != "full" || estimated_tokens(&self.permitted_text()?) <= budget {
            return Ok(None);
        }
        let words: Vec<String> = query
            .split(|c: char| !c.is_alphanumeric())
            .filter(|word| word.chars().count() > 2)
            .map(str::to_lowercase)
            .collect();
        let mut ranked = self.scenes.clone();
        ranked.sort_by_cached_key(|scene| {
            let text = format!("{} {}", scene.heading, scene.text).to_lowercase();
            std::cmp::Reverse(
                words
                    .iter()
                    .filter(|word| text.contains(word.as_str()))
                    .count(),
            )
        });
        let total = self.scenes.len();
        let mut remaining = budget.saturating_sub(128);
        let mut selected = Vec::new();
        for mut scene in ranked {
            if remaining < 128 || selected.len() >= 6 {
                break;
            }
            let allowance = remaining.min((budget / 3).max(128));
            if estimated_tokens(&scene.text) > allowance {
                let mut excerpt = String::new();
                for character in scene.text.chars() {
                    excerpt.push(character);
                    if estimated_tokens(&excerpt) >= allowance.saturating_sub(64) {
                        break;
                    }
                }
                scene.text = format!("{excerpt}\n[Scene excerpt; remaining text omitted]");
            }
            let cost = estimated_tokens(&format!(
                "[Scene {}: {}]\n{}",
                scene.id, scene.heading, scene.text
            ));
            if cost > remaining {
                continue;
            }
            remaining -= cost;
            selected.push(scene);
        }
        self.scene_ids = selected.iter().map(|scene| scene.id).collect();
        self.scenes = selected;
        self.scope = "scenes".into();
        Ok(Some(format!(
            "The screenplay has {total} scenes and exceeds the model context. Local keyword search selected excerpts from scenes {:?}. Only these excerpts were read; do not claim to have read the entire screenplay. Ask for a specific scene or question when more coverage is needed.",
            self.scene_ids
        )))
    }
    pub fn permitted_text(&self) -> Result<String, String> {
        match self.scope.as_str() {
            "none" | "" => Ok(String::new()),
            "selection" => Ok(self.selection.clone()),
            "scene" | "scenes" => {
                if self.scene_ids.is_empty() {
                    return Err("Choose a scene to share.".into());
                }
                let mut result = Vec::new();
                for id in &self.scene_ids {
                    let scene = self
                        .scenes
                        .iter()
                        .find(|s| s.id == *id)
                        .ok_or("A shared scene no longer exists. Choose it again.")?;
                    result.push(format!(
                        "[Scene {}: {}]\n{}",
                        scene.id, scene.heading, scene.text
                    ));
                }
                Ok(result.join("\n\n"))
            }
            "full" => Ok(self
                .scenes
                .iter()
                .map(|s| format!("[Scene {}]\n{}", s.id, s.text))
                .collect::<Vec<_>>()
                .join("\n\n")),
            _ => Err("Unknown sharing scope.".into()),
        }
    }
}

// UTF-8 byte count is a deliberately conservative estimate, not provider billing usage.
pub fn estimated_tokens(text: &str) -> usize {
    text.len().saturating_add(3) / 3 + text.chars().filter(|c| !c.is_ascii()).count()
}

pub fn budget_messages(
    system: String,
    history: &[Message],
    limit: usize,
    output: usize,
) -> Result<Vec<Message>, String> {
    if !(1024..=1_048_576).contains(&limit) || output >= limit {
        return Err("Invalid model context budget.".into());
    }
    let input_limit = limit.saturating_sub(output).saturating_sub(256);
    let last = history.last().ok_or("A message is required.")?;
    let mut used = estimated_tokens(&system) + estimated_tokens(&last.content) + 32;
    if used > input_limit {
        return Err("The shared text exceeds this model's context budget. Share fewer scenes or increase the context limit for your model.".into());
    }
    let mut recent = vec![last.clone()];
    for message in history[..history.len() - 1].iter().rev() {
        let size = estimated_tokens(&message.content) + 8;
        if used + size > input_limit {
            break;
        }
        used += size;
        recent.push(message.clone());
    }
    recent.reverse();
    let mut result = vec![Message {
        role: "system".into(),
        content: system,
    }];
    result.extend(recent);
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn context(scope: &str) -> Context {
        Context {
            scope: scope.into(),
            scenes: vec![
                Scene {
                    id: 1,
                    heading: "First".into(),
                    text: "allowed".into(),
                },
                Scene {
                    id: 2,
                    heading: "Secret".into(),
                    text: "private".into(),
                },
            ],
            scene_ids: vec![1],
            selection: "selected".into(),
        }
    }
    #[test]
    fn sharing_is_enforced() {
        assert_eq!(context("none").permitted_text().unwrap(), "");
        assert_eq!(context("selection").permitted_text().unwrap(), "selected");
        let text = context("scenes").permitted_text().unwrap();
        assert!(text.contains("allowed"));
        assert!(!text.contains("private"));
        assert!(!text.contains("Secret"));
        assert!(
            context("full")
                .permitted_text()
                .unwrap()
                .contains("private")
        );
        assert!(context("invented").permitted_text().is_err());
    }
    #[test]
    fn missing_scene_is_rejected() {
        let mut c = context("scene");
        c.scene_ids = vec![99];
        assert!(c.permitted_text().is_err());
    }
    #[test]
    fn oversized_screenplay_selects_bounded_relevant_excerpts() {
        let mut shared = context("full");
        shared.scenes[0].text = "ordinary dialogue ".repeat(2000);
        shared.scenes[1].text = "secret observatory ".repeat(2000);
        let notice = shared.fit_screenplay("observatory", 1200).unwrap().unwrap();
        assert_eq!(shared.scenes[0].id, 2);
        assert!(estimated_tokens(&shared.permitted_text().unwrap()) <= 1200);
        assert!(notice.contains("do not claim"));
        let mut private = context("none");
        assert!(private.fit_screenplay("Secret", 100).unwrap().is_none());
        assert!(private.permitted_text().unwrap().is_empty());
    }
    #[test]
    fn budget_preserves_latest_and_rejects_oversize() {
        let history = vec![
            Message {
                role: "user".into(),
                content: "x".repeat(9000),
            },
            Message {
                role: "user".into(),
                content: "latest".into(),
            },
        ];
        let result = budget_messages("system".into(), &history, 2048, 512).unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[1].content, "latest");
        assert!(budget_messages("x".repeat(9000), &history, 2048, 512).is_err());
    }
}
