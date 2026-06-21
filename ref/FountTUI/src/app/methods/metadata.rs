use crate::app::App;
use crate::types::{LineType, get_marker_color};
use crate::metadata::MetadataStore;

impl App {
    pub fn update_metadata(&mut self) {
        self.metadata.clear();
        
        let mut current_scene_idx: Option<usize> = None;
        
        // Let's rewrite the loop to avoid simultaneous borrows
        let mut metadata_to_add = Vec::new();
        for (i, (&lt, line)) in self.types.iter().zip(self.lines.iter()).enumerate() {
            if lt == LineType::SceneHeading {
                current_scene_idx = self.index_cards.iter().position(|c| c.start_line == i && !c.is_section);
            } else if lt == LineType::Section {
                current_scene_idx = None;
            }

            let mut start = 0;
            while let Some(s_idx) = line[start..].find("[[") {
                let actual_start = start + s_idx;
                if let Some(e_idx) = line[actual_start..].find("]]") {
                    let content = line[actual_start + 2..actual_start + e_idx].to_string();
                    metadata_to_add.push((content, current_scene_idx, i));
                    start = actual_start + e_idx + 2;
                } else {
                    break;
                }
            }
        }

        // Now process them with a mutable borrow
        for (content, scene_idx, line_idx) in metadata_to_add {
            Self::process_metadata_tag_static(&mut self.metadata, &content, scene_idx, line_idx);
        }
        
        self.apply_scene_colors();
    }

    fn process_metadata_tag_static(metadata: &mut MetadataStore, content: &str, scene_idx: Option<usize>, line_idx: usize) {
        let parts: Vec<&str> = content.splitn(2, ':').collect();
        if parts.len() == 2 {
            let key = parts[0].trim().to_lowercase();
            let value_str = parts[1].trim();
            
            let values: Vec<String> = value_str.split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            
            if !values.is_empty() && let Some(s_idx) = scene_idx {
                metadata.add_entry(s_idx, key, values, line_idx);
            }
        }
    }

    fn apply_scene_colors(&mut self) {
        for card in &mut self.index_cards {
            card.color = None;
        }

        let scene_metadata = self.metadata.scene_metadata.clone();
        for (s_idx, entries) in scene_metadata {
            if s_idx >= self.index_cards.len() { continue; }
            
            for entry in entries {
                if entry.key == "sceneclr"
                    && let Some(color_name) = entry.values.first()
                    && let Some(color) = get_marker_color(color_name, &self.theme)
                {
                    self.index_cards[s_idx].color = Some(color);
                }
            }
        }
    }
}
