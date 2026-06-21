use crate::app::{App, AppMode};
use crate::types::LineType;
use crate::formatting::StringCaseExt;

impl App {
    pub fn get_command_completions(&self) -> Vec<String> {
        let mut commands: Vec<String> = Vec::new();
        let all_shortcuts = crate::app::shortcuts::get_all_shortcuts();

        for s in all_shortcuts {
            if s.key.starts_with('/') {
                let full_cmd = s.key.trim_start_matches('/').to_string();
                if !full_cmd.is_empty() && !commands.contains(&full_cmd) {
                    commands.push(full_cmd);
                }
                
                // Also add the base command (e.g., 'set' from '/set focus')
                let base_cmd = s.key.trim_start_matches('/').split_whitespace().next().unwrap_or("").to_string();
                if !base_cmd.is_empty() && !commands.contains(&base_cmd) {
                    commands.push(base_cmd);
                }
            } else if s.category.contains("Settings (/set)") {
                commands.push(format!("set {}", s.key));
            }
        }

        // Add shorthands and aliases not explicitly in the shortcuts registry
        let aliases = vec!["t", "newfile"];
        for a in aliases {
            if !commands.contains(&a.to_string()) {
                commands.push(a.to_string());
            }
        }

        let themes = self.theme_manager.list_themes();
        for t in themes {
            let slug = t.to_lowercase().replace(' ', "");
            commands.push(format!("theme {}", slug));
            commands.push(format!("t {}", slug));
        }

        commands
    }
}

impl crate::app::App {
    pub fn update_autocomplete(&mut self) {
        let pending_tab_suggestion = self.suggestion.take();
        let mut matched = false;

        if !self.config.autocomplete {
            return;
        }

        if self.cursor_y >= self.lines.len() {
            return;
        }

        let line = &self.lines[self.cursor_y];
        let char_count = line.chars().count();

        if self.cursor_x != char_count || char_count == 0 {
            return;
        }

        let upper_line = line.to_uppercase_1to1();

        if let Some(sug) = pending_tab_suggestion {
            let upper_trim = upper_line.trim_start();
            let full_text = format!("{}{}", upper_trim, sug);

            if self.characters.contains(&full_text) || self.locations.contains(&full_text) {
                self.suggestion = Some(sug);
                if self.characters.contains(&full_text) {
                    self.types[self.cursor_y] = LineType::Character;
                } else if self.locations.contains(&full_text) {
                    self.types[self.cursor_y] = LineType::SceneHeading;
                }
                return;
            }
        }

        let is_char_type = matches!(
            self.types.get(self.cursor_y),
            Some(LineType::Character) | Some(LineType::DualDialogueCharacter)
        );

        if is_char_type || upper_line.starts_with('@') {
            let input = upper_line.trim_start_matches('@').trim_start();
            if !input.is_empty() {
                let best_match = self
                    .characters
                    .iter()
                    .filter(|c| c.starts_with(input) && c.len() > input.len())
                    .min_by_key(|c| c.len());
                if let Some(c) = best_match {
                    self.suggestion = Some(c[input.len()..].to_string());
                    return;
                }
            }
        }

        let is_scene_type = self.types.get(self.cursor_y) == Some(&LineType::SceneHeading);

        if is_scene_type || upper_line.starts_with('.') {
            let mut input = upper_line.trim_start();

            if let Some(rest) = input.strip_prefix('.')
                && !input.starts_with("..")
            {
                input = rest;
            } else {
                let prefixes = [
                    "INT. ",
                    "EXT. ",
                    "EST. ",
                    "INT/EXT. ",
                    "I/E. ",
                    "E/I. ",
                    "I./E. ",
                    "E./I. ",
                    "INT ",
                    "EXT ",
                    "EST ",
                    "INT/EXT ",
                    "I/E ",
                    "E/I ",
                ];
                for p in prefixes {
                    if let Some(rest) = input.strip_prefix(p) {
                        input = rest;
                        matched = true;
                        break;
                    }
                }
                if !matched && let Some((_, rest)) = input.split_once(". ") {
                    input = rest;
                }
            }

            input = input.trim_start();

            if !input.is_empty() {
                let mut best_match: Option<&String> = None;
                for loc in &self.locations {
                    if loc.starts_with(input)
                        && loc.len() > input.len()
                        && best_match.is_none_or(|b| loc.len() < b.len())
                    {
                        best_match = Some(loc);
                    }
                }
                if let Some(loc) = best_match {
                    self.suggestion = Some(loc[input.len()..].to_string());
                }
            }
        }
    }

    pub fn trigger_metadata_autocomplete(&mut self) {
        self.mode = AppMode::MetadataAutocomplete;
        self.metadata_query.clear();
        self.update_metadata_suggestions();
        self.metadata_state.select(Some(0));
    }

    pub fn update_metadata_suggestions(&mut self) {
        let all_tags = vec![
            "props:", "wardrobe:", "makeup:", "sfx:", "vfx:", "music:", "cast:", 
            "dnotes:", "scenestatus:", "tags:", "subtext:", "scenetype:", "sceneclr:",
            "note:", "marker:", "synopsis:", "extras:", "stunts:", "vehicles:",
            "animals:", "setdressing:", "sound:", "equipment:", "security:", "greenery:",
        ];
        
        let query = self.metadata_query.to_lowercase();
        self.metadata_suggestions = all_tags
            .into_iter()
            .filter(|t| t.starts_with(&query))
            .map(|t| t.to_string())
            .collect();
            
        // Adjust selection if it's out of bounds
        let len = self.metadata_suggestions.len();
        if len > 0 {
            let current = self.metadata_state.selected().unwrap_or(0);
            if current >= len {
                self.metadata_state.select(Some(len - 1));
            } else {
                self.metadata_state.select(Some(current));
            }
        } else {
            self.metadata_state.select(None);
        }
    }
}
