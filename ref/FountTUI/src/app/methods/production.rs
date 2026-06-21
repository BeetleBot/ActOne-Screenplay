use crate::app::App;
use crate::types::LineType;

impl App {
    /// Auto-assigns suffixed scene numbers to un-numbered scene headings
    /// when `production_lock` is ON. Scenes between locked `#N#` and `#N+1#`
    /// get `#NA#`, `#NB#`, etc.
    pub fn auto_number_locked_scenes(&mut self) {
        // Collect all scene heading indices and their current tags
        let scene_indices: Vec<usize> = (0..self.lines.len())
            .filter(|&i| self.types[i] == LineType::SceneHeading)
            .collect();

        if scene_indices.is_empty() {
            return;
        }

        // Build a snapshot: (line_index, Option<tag>)
        let scene_tags: Vec<(usize, Option<String>)> = scene_indices
            .iter()
            .map(|&i| (i, Self::extract_scene_tag(&self.lines[i])))
            .collect();

        // Find un-numbered scenes and assign them suffix tags
        for (pos, &(line_idx, ref tag)) in scene_tags.iter().enumerate() {
            if tag.is_some() {
                continue; // Already numbered, skip
            }

            // Find the previous numbered scene (walking backwards)
            let prev_base = (0..pos).rev().find_map(|j| {
                scene_tags[j].1.as_ref().and_then(|t| {
                    // Extract the integer base from the tag
                    let digits: String = t.chars().take_while(|c| c.is_ascii_digit()).collect();
                    if digits.is_empty() {
                        None
                    } else {
                        Some((j, digits.parse::<usize>().unwrap_or(0), t.clone()))
                    }
                })
            });

            // Determine the base number to suffix from
            let base_num = if let Some((_, num, _)) = prev_base {
                num
            } else {
                // No previous numbered scene — use 0 as the base
                0
            };

            // Collect all existing suffixes for this base number
            // (between the previous base and the next integer scene)
            let mut existing_suffixes: Vec<String> = Vec::new();
            let prefix = base_num.to_string();
            for (_, other_tag) in &scene_tags {
                if let Some(t) = other_tag
                    && t.len() > prefix.len()
                        && t.starts_with(&prefix)
                        && t[prefix.len()..].chars().all(|c| c.is_ascii_uppercase())
                    {
                        existing_suffixes.push(t[prefix.len()..].to_string());
                    }
            }

            // Also check the lines directly (in case we already assigned
            // suffixes earlier in this same pass via a previous iteration)
            for &other_idx in &scene_indices {
                if other_idx == line_idx {
                    continue;
                }
                if let Some(t) = Self::extract_scene_tag(&self.lines[other_idx])
                    && t.len() > prefix.len()
                        && t.starts_with(&prefix)
                        && t[prefix.len()..].chars().all(|c| c.is_ascii_uppercase())
                    {
                        let suf = t[prefix.len()..].to_string();
                        if !existing_suffixes.contains(&suf) {
                            existing_suffixes.push(suf);
                        }
                    }
            }

            let suffix = Self::next_suffix_label(&existing_suffixes);
            let new_tag = format!("{}{}", base_num, suffix);
            let base = Self::strip_scene_number_from_line(&self.lines[line_idx]).to_string();
            self.lines[line_idx] = format!("{} #{}#", base, new_tag);
        }
    }

    /// Numbers ALL scene headings chronologically. Respects non-integer custom
    /// overrides (e.g. `14B`) — those scenes keep their tag, subsequent integer
    /// scenes are re-indexed. Ignores `production_lock`; this is an explicit
    /// on-demand action.
    pub fn renumber_all_scenes(&mut self) {
        let mut count = 1usize;
        let mut changed = false;

        for i in 0..self.lines.len() {
            if self.types[i] != LineType::SceneHeading {
                continue;
            }
            let base = Self::strip_scene_number_from_line(&self.lines[i]).to_string();
            // Detect existing custom (non-integer) tag
            let existing_custom: Option<String> = {
                let t = self.lines[i].trim_end();
                if let Some(stripped) = t.strip_suffix('#') {
                    stripped.rfind('#').and_then(|o| {
                        let inner = &stripped[o + 1..];
                        if !inner.is_empty()
                            && !inner.contains(' ')
                            && !inner.chars().all(|c| c.is_ascii_digit())
                        {
                            Some(inner.to_string())
                        } else {
                            None
                        }
                    })
                } else {
                    None
                }
            };

            let new_line = if let Some(custom) = existing_custom {
                // Keep custom tag, don't consume an integer slot
                format!("{} #{}#", base, custom)
            } else {
                let n = count;
                count += 1;
                format!("{} #{}#", base, n)
            };

            if self.lines[i] != new_line {
                self.lines[i] = new_line;
                changed = true;
            }
        }

        if changed {
            self.parse_document();
        }
    }

    /// Injects or updates the scene number **only for the line the cursor is on**.
    /// Does nothing if the current line is not a scene heading.
    /// Respects `production_lock`: if locked, this call is still allowed (it's
    /// triggered explicitly by the user).
    /// Unlike `renumber_all_scenes`, this only touches one line.
    pub fn inject_current_scene_number(&mut self) {
        self.inject_scene_number_tag(None);
    }

    /// Inject a specific scene number tag `#tag#` or auto-compute one.
    pub fn inject_scene_number_tag(&mut self, tag: Option<&str>) {
        let mut y = self.cursor_y.min(self.types.len().saturating_sub(1));
        while y > 0 && self.types[y] != LineType::SceneHeading {
            y -= 1;
        }

        if y >= self.types.len() || self.types[y] != LineType::SceneHeading {
            self.set_status("No scene heading found");
            return;
        }
        let base = Self::strip_scene_number_from_line(&self.lines[y]).to_string();
        let label = if let Some(t) = tag {
            t.to_string()
        } else {
            // Preserve existing non-integer custom tag
            let existing_custom: Option<String> = {
                let t = self.lines[y].trim_end();
                if let Some(stripped) = t.strip_suffix('#') {
                    stripped.rfind('#').and_then(|o| {
                        let inner = &stripped[o + 1..];
                        if !inner.is_empty()
                            && !inner.contains(' ')
                            && !inner.chars().all(|c| c.is_ascii_digit())
                        {
                            Some(inner.to_string())
                        } else {
                            None
                        }
                    })
                } else {
                    None
                }
            };
            existing_custom.unwrap_or_else(|| self.compute_scene_number_for(y).to_string())
        };

        let new_line = format!("{} #{}#", base, label);
        if self.lines[y] != new_line {
            self.lines[y] = new_line;
            self.parse_document();
            self.set_status(&format!("Scene #{} injected", label));
        } else {
            self.set_status("Scene already numbered");
        }
    }

    /// Removes `#num#` tags from ALL scene headings. Always allowed, even with
    /// `production_lock` on.
    pub fn strip_all_scene_numbers(&mut self) {
        let mut changed = false;
        for i in 0..self.lines.len() {
            if self.types[i] != LineType::SceneHeading {
                continue;
            }
            let base = Self::strip_scene_number_from_line(&self.lines[i]);
            if self.lines[i].trim_end() != base {
                self.lines[i] = base.to_string();
                changed = true;
            }
        }
        if changed {
            self.parse_document();
            self.set_status("All scene numbers cleared");
        } else {
            self.set_status("No scene numbers found");
        }
    }
}
