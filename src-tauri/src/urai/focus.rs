use super::tools::SceneRef;
use regex::Regex;
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusScene {
    #[serde(flatten)]
    reference: SceneRef,
    explicit_label: bool,
}

static ORDINAL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(?:(\d+)(?:st|nd|rd|th)\s+scene|scene\s+at\s+position\s+(\d+))\b").unwrap()
});
static LABELS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\bscenes?\s+(#?\d+[a-z]*#?(?:\s*(?:,\s*(?:and\s+)?|\band\s+|\bto\s+|[-–—]\s*)#?\d+[a-z]*#?)*)\b#?").unwrap()
});
static LABEL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)#?\d+[a-z]*#?").unwrap());
static CURSOR: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)\b(?:this|current|active) scene\b").unwrap());
static ADJACENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)\b(next|previous|preceding) scene\b").unwrap());
static HEADING_LABEL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"#[^#\s]+#").unwrap());

fn unique(mut matches: impl Iterator<Item = usize>) -> Option<usize> {
    let first = matches.next()?;
    matches.next().is_none().then_some(first)
}

fn locate(scenes: &[FocusScene], reference: &SceneRef) -> Option<usize> {
    unique(scenes.iter().enumerate().filter_map(|(position, scene)| {
        (scene.reference.label == reference.label && scene.reference.heading == reference.heading)
            .then_some(position)
    }))
    .or_else(|| {
        let heading = HEADING_LABEL.replace_all(&reference.heading, "");
        unique(scenes.iter().enumerate().filter_map(|(position, scene)| {
            (HEADING_LABEL
                .replace_all(&scene.reference.heading, "")
                .trim()
                == heading.trim())
            .then_some(position)
        }))
    })
}

fn resolve(
    query: &str,
    scenes: &[FocusScene],
    cursor_line: Option<usize>,
    previous: &[SceneRef],
) -> Result<Vec<usize>, String> {
    let numbered = scenes.iter().any(|scene| scene.explicit_label);
    let by_label = |label: &str| {
        let mut matches = scenes.iter().enumerate().filter(|(_, scene)| {
            (!numbered || scene.explicit_label) && scene.reference.label.eq_ignore_ascii_case(label)
        });
        match (matches.next(), matches.next()) {
            (Some((position, _)), None) => Ok(position),
            (None, _) => Err(format!(
                "Scene {label} was not found in the current screenplay."
            )),
            _ => Err(format!(
                "Scene {label} matches multiple headings. Specify its position."
            )),
        }
    };
    let mut ids = Vec::new();
    let mut push = |position: usize| {
        let id = scenes[position].reference.id;
        if !ids.contains(&id) {
            ids.push(id);
        }
    };
    for captures in ORDINAL.captures_iter(query) {
        let position = if let Some(label) = captures.get(1) {
            by_label(label.as_str())?
        } else {
            let position = captures[2]
                .parse::<usize>()
                .ok()
                .and_then(|number| number.checked_sub(1));
            position
                .filter(|position| *position < scenes.len())
                .ok_or_else(|| format!("The screenplay does not have a {}.", &captures[0]))?
        };
        push(position);
    }
    for captures in LABELS.captures_iter(query) {
        let list = &captures[1];
        let mut prior = None;
        for label in LABEL.find_iter(list) {
            let position = by_label(label.as_str().trim_matches('#'))?;
            if let Some((previous_position, end)) = prior {
                let connector: &str = &list[end..label.start()];
                if connector.trim().eq_ignore_ascii_case("to")
                    || matches!(connector.trim(), "-" | "–" | "—")
                {
                    for entry in usize::min(previous_position, position)
                        ..=usize::max(previous_position, position)
                    {
                        push(entry);
                    }
                }
            }
            push(position);
            prior = Some((position, label.end()));
        }
    }
    if !ids.is_empty() {
        return Ok(ids);
    }
    if CURSOR.is_match(query) {
        let scene = cursor_line.and_then(|line| {
            scenes.iter().find(|scene| {
                (scene.reference.start_line..=scene.reference.end_line).contains(&line)
            })
        });
        return scene
            .map(|scene| vec![scene.reference.id])
            .ok_or_else(|| "Place the cursor inside a scene first.".into());
    }
    if let Some(direction) = ADJACENT.captures(query) {
        let anchor = previous
            .last()
            .and_then(|reference| locate(scenes, reference))
            .ok_or("Tell UrAI which scene to start from first.")?;
        let position = if direction[1].eq_ignore_ascii_case("next") {
            anchor.checked_add(1)
        } else {
            anchor.checked_sub(1)
        };
        return position
            .and_then(|position| scenes.get(position))
            .map(|scene| vec![scene.reference.id])
            .ok_or_else(|| "There is no scene in that direction.".into());
    }
    Ok(previous
        .iter()
        .filter_map(|reference| locate(scenes, reference))
        .map(|position| scenes[position].reference.id)
        .collect())
}

#[tauri::command]
pub fn urai_resolve_scene_focus(
    query: String,
    scenes: Vec<FocusScene>,
    cursor_line: Option<usize>,
    previous: Vec<SceneRef>,
) -> Result<Vec<usize>, String> {
    resolve(&query, &scenes, cursor_line, &previous)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scene(id: usize, label: &str, explicit_label: bool) -> FocusScene {
        let heading = format!("EXT. LOCATION {id} - DAY #{label}#");
        FocusScene {
            reference: SceneRef {
                id,
                label: label.into(),
                heading,
                start_line: id * 4,
                end_line: id * 4 + 3,
            },
            explicit_label,
        }
    }

    #[test]
    fn resolves_printed_labels_ranges_and_followups() {
        let scenes = [
            scene(1, "15", true),
            scene(2, "15A", true),
            scene(3, "16", true),
        ];
        assert_eq!(
            resolve("Read the 16th scene", &scenes, None, &[]).unwrap(),
            [3]
        );
        assert_eq!(
            resolve("Compare scenes #15# through scene 16", &scenes, None, &[]).unwrap(),
            [1, 3]
        );
        assert_eq!(
            resolve("Read scenes #15# to #16#", &scenes, None, &[]).unwrap(),
            [1, 2, 3]
        );
        assert_eq!(
            resolve("Read scene at position 2", &scenes, None, &[]).unwrap(),
            [2]
        );
        assert_eq!(
            resolve("Read this scene", &scenes, Some(9), &[]).unwrap(),
            [2]
        );
        assert_eq!(
            resolve(
                "What happens in the next scene?",
                &scenes,
                None,
                &[scenes[1].reference.clone()]
            )
            .unwrap(),
            [3]
        );
    }

    #[test]
    fn only_unnumbered_drafts_fall_back_to_scene_order() {
        let mut scenes = [scene(1, "1", false), scene(2, "16", true)];
        assert!(resolve("Read the 1st scene", &scenes, None, &[]).is_err());
        scenes[1].explicit_label = false;
        assert_eq!(
            resolve("Read the 1st scene", &scenes, None, &[]).unwrap(),
            [1]
        );
    }
}
