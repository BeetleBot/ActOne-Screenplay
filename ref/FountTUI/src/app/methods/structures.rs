use crate::app::{App, Structure, StructureBeat, BufferState, AppMode};

impl App {
    pub fn load_structures(&mut self) {
        let contents = [
            include_str!("../../../assets/structures/three-act_structure.fountain"),
            include_str!("../../../assets/structures/save_the_cat.fountain"),
            include_str!("../../../assets/structures/the_hero’s_journey.fountain"),
            include_str!("../../../assets/structures/the_story_circle.fountain"),
            include_str!("../../../assets/structures/freytags_pyramid.fountain"),
            include_str!("../../../assets/structures/john_trubys_7_key_steps.fountain"),
            include_str!("../../../assets/structures/michael_hauges_6_stage_journey.fountain"),
            include_str!("../../../assets/structures/the_sequence_approach.fountain"),
        ];
        
        self.structures.clear();
        for content in contents {
            self.structures.extend(parse_structures(content));
        }
    }

    pub fn apply_selected_structure(&mut self) {
        if self.structure_selected >= self.structures.len() {
            return;
        }
        
        let struct_data = self.structures[self.structure_selected].clone();
        let mut lines = Vec::new();
        
        for beat in &struct_data.beats {
            lines.push(format!("#{}", beat.label));
            lines.push(format!("={}", beat.description));
            lines.push(String::new());
            lines.push(String::new());
            lines.push(String::new());
        }
        
        if lines.is_empty() {
            lines.push(String::new());
        }
        
        let revised_lines = vec![false; lines.len()];
        let new_buf = BufferState {
            lines,
            revised_lines,
            ..Default::default()
        };
        
        self.buffers.push(new_buf);
        let new_idx = self.buffers.len() - 1;
        self.has_multiple_buffers = self.buffers.len() > 1;
        self.switch_buffer(new_idx);
        self.mode = AppMode::Normal;
        self.set_status(&format!("New file created with {} structure", struct_data.name));
    }

    pub fn import_selected_structure(&mut self) {
        if self.structure_selected >= self.structures.len() {
            return;
        }
        
        self.save_state(true);
        let struct_data = self.structures[self.structure_selected].clone();
        
        let mut insert_idx = self.cursor_y;
        
        // If current line isn't empty, insert after it
        if insert_idx < self.lines.len() && !self.lines[insert_idx].trim().is_empty() {
            insert_idx += 1;
        }

        for beat in &struct_data.beats {
            self.lines.insert(insert_idx, format!("#{}", beat.label));
            self.revised_lines.insert(insert_idx, self.revision_mode);
            insert_idx += 1;
            
            self.lines.insert(insert_idx, format!("={}", beat.description));
            self.revised_lines.insert(insert_idx, self.revision_mode);
            insert_idx += 1;
            
            for _ in 0..3 {
                self.lines.insert(insert_idx, String::new());
                self.revised_lines.insert(insert_idx, self.revision_mode);
                insert_idx += 1;
            }
        }
        
        self.cursor_y = insert_idx;
        self.cursor_x = 0;
        self.dirty = true;
        self.mode = AppMode::Normal;
        self.set_status(&format!("Imported {} structure into current buffer", struct_data.name));
    }
}

fn parse_structures(content: &str) -> Vec<Structure> {
    let mut structures = Vec::new();
    let mut current_struct: Option<Structure> = None;
    let mut current_beat: Option<StructureBeat> = None;
    
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        
        if let Some(rest) = line.strip_prefix("##") {
            let rest = rest.trim_start();
            if let Some(beat) = current_beat.take()
                && let Some(ref mut s) = current_struct
            {
                s.beats.push(beat);
            }
            current_beat = Some(StructureBeat {
                label: rest.to_string(),
                description: String::new(),
            });
        } else if let Some(rest) = line.strip_prefix('#') {
            let rest = rest.trim_start();
            if let Some(beat) = current_beat.take()
                && let Some(ref mut s) = current_struct
            {
                s.beats.push(beat);
            }
            if let Some(s) = current_struct.take() {
                structures.push(s);
            }
            current_struct = Some(Structure {
                name: rest.to_string(),
                description: String::new(),
                beats: Vec::new(),
            });
        } else if let Some(rest) = line.strip_prefix('=') {
            let rest = rest.trim_start();
            let desc = rest.to_string();
            if let Some(ref mut beat) = current_beat {
                if beat.description.is_empty() {
                    beat.description = desc;
                } else {
                    beat.description.push(' ');
                    beat.description.push_str(&desc);
                }
            } else if let Some(ref mut s) = current_struct {
                if s.description.is_empty() {
                    s.description = desc;
                } else {
                    s.description.push(' ');
                    s.description.push_str(&desc);
                }
            }
        }
    }
    
    if let Some(beat) = current_beat.take()
        && let Some(ref mut s) = current_struct
    {
        s.beats.push(beat);
    }
    if let Some(s) = current_struct.take() {
        structures.push(s);
    }
    
    structures
}
