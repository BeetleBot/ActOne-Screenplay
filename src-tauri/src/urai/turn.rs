use super::{Delta, provider::Completion, tools::SceneRef, types::estimated_tokens};
use regex::Regex;
use serde_json::{Value, json};
use std::sync::LazyLock;
use std::time::{Duration, Instant};
use tauri::Emitter;

pub(super) struct LiveTurn<'a> {
    pub window: &'a tauri::WebviewWindow,
    request_id: &'a str,
    snapshots: bool,
    raw: String,
    activities: Vec<Value>,
    sources: Vec<SceneRef>,
    activity_id: usize,
    last_emit: Option<Instant>,
}

static TOOL_START: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?m)^[ \t]*(?:```(?:json)?[ \t]*\r?\n[ \t]*)?\{\s*"tool"\s*:"#).unwrap()
});
static TOOL_HEADING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:^|\n)[ \t#*_`]*(?:scene[- ]read|tool[- ]call(?:ing)?)[ \t*_`:]*\r?\n[\s]*$")
        .unwrap()
});

fn hide_tool_protocol(text: &str) -> String {
    let mut visible = String::new();
    let mut rest = text;
    while let Some(start) = TOOL_START.find(rest) {
        let prefix = &rest[..start.start()];
        let json_start = start.start() + start.as_str().find('{').unwrap();
        let mut values =
            serde_json::Deserializer::from_str(&rest[json_start..]).into_iter::<Value>();
        match values.next() {
            Some(Ok(value)) if value["tool"].is_string() && value["args"].is_object() => {
                visible.push_str(&TOOL_HEADING.replace(prefix, "\n"));
                rest = &rest[json_start + values.byte_offset()..];
                if start.as_str().contains("```") {
                    rest = rest.trim_start().strip_prefix("```").unwrap_or(rest);
                }
            }
            Some(Err(error)) if error.is_eof() => {
                visible.push_str(&TOOL_HEADING.replace(prefix, "\n"));
                return visible;
            }
            _ => {
                visible.push_str(&rest[..start.end()]);
                rest = &rest[start.end()..];
            }
        }
    }
    visible.push_str(rest);
    visible
}

fn reply_content(raw: &str) -> String {
    let mut remaining = raw;
    let mut reply = String::new();
    while let Some(start) = remaining.to_ascii_lowercase().find("<think>") {
        reply.push_str(&remaining[..start]);
        let thinking = &remaining[start + 7..];
        let Some(end) = thinking.to_ascii_lowercase().find("</think>") else {
            return hide_tool_protocol(&reply).trim().to_owned();
        };
        remaining = &thinking[end + 8..];
    }
    reply.push_str(remaining);
    hide_tool_protocol(&reply).trim().to_owned()
}

impl<'a> LiveTurn<'a> {
    pub fn new(window: &'a tauri::WebviewWindow, request_id: &'a str, snapshots: bool) -> Self {
        Self {
            window,
            request_id,
            snapshots,
            raw: String::new(),
            activities: vec![],
            sources: vec![],
            activity_id: 0,
            last_emit: None,
        }
    }

    fn snapshot(&self, status: &str, usage: Option<&Completion>) -> Value {
        let content = reply_content(&self.raw);
        let tokens = usage
            .and_then(|result| result.output_tokens)
            .unwrap_or_else(|| estimated_tokens(&content) as u64);
        json!({
            "requestId": self.request_id, "status": status, "content": content, "toolCalls": self.activities,
            "sources": self.sources, "tokens": tokens, "inputTokens": usage.and_then(|result| result.input_tokens),
        })
    }

    fn emit(&mut self, status: &str, usage: Option<&Completion>) {
        if !self.snapshots {
            return;
        }
        let _ = self.window.emit_to(
            self.window.label(),
            "urai-turn",
            self.snapshot(status, usage),
        );
        self.last_emit = Some(Instant::now());
    }

    pub fn start(&mut self) {
        self.emit("running", None);
        self.last_emit = None;
    }

    pub fn push(&mut self, text: &str) {
        if !self.snapshots {
            let _ = self.window.emit_to(
                self.window.label(),
                "urai-delta",
                Delta {
                    request_id: self.request_id.into(),
                    text: text.into(),
                },
            );
            return;
        }
        self.raw.push_str(text);
        if self
            .last_emit
            .is_none_or(|time| time.elapsed() >= Duration::from_millis(33))
        {
            self.emit("running", None);
        }
    }

    pub fn activity(
        &mut self,
        name: &str,
        args: Value,
        result: &str,
        sources: &[SceneRef],
        status: &str,
    ) {
        if !self.snapshots {
            let _ = self.window.emit_to(self.window.label(), "urai-tool", json!({"requestId": self.request_id, "name": name, "args": args, "result": result, "sources": sources, "status": status}));
            return;
        }
        self.activity_id += 1;
        if name == "index_screenplay" {
            self.activities.retain(|activity| activity["name"] != name);
        }
        self.activities.push(json!({"id": self.activity_id.to_string(), "name": name, "args": args, "result": result, "sources": sources, "status": status}));
        for source in sources {
            if !self.sources.iter().any(|previous| previous.id == source.id) {
                self.sources.push(source.clone());
            }
        }
        self.emit("running", None);
    }

    pub fn finish(&mut self, result: &Result<Completion, String>) -> Option<Value> {
        match result {
            Ok(completion) => {
                if self.snapshots {
                    self.raw.clone_from(&completion.text);
                    return Some(self.snapshot("completed", Some(completion)));
                }
            }
            Err(error) => self.emit(
                if error == "Aborted" {
                    "cancelled"
                } else {
                    "failed"
                },
                None,
            ),
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mixed_tool_protocol_is_hidden_without_losing_the_answer() {
        let reply = "**scene-read**\n\n{\"tool\":\"read_scene\",\"args\":{\"label\":\"#16#\"}}\n\n**Scene summary**\n\nMaya leaves.";
        assert_eq!(reply_content(reply), "**Scene summary**\n\nMaya leaves.");
        assert_eq!(
            reply_content("Text\n\n```json\n{\"tool\":\"read_scene\",\"args\":{}}\n```\n\nMore"),
            "Text\n\n\n\nMore"
        );
        assert_eq!(
            reply_content("Text\n{\"tool\":\"read_scene\",\"args\":"),
            "Text"
        );
        assert_eq!(reply_content("{\"example\":true}"), "{\"example\":true}");
    }

    #[test]
    fn model_thoughts_do_not_appear_in_projected_replies() {
        assert_eq!(
            reply_content("<THINK>notes</think> **Answer**"),
            "**Answer**"
        );
        assert_eq!(reply_content("Reply <think>still thinking"), "Reply");
    }
}
