use crate::app::App;
use crate::types::LineType;
use ratatui::layout::Rect;

#[derive(Clone, Debug)]
pub struct IndexCard {
    pub start_line: usize,
    pub end_line: usize,
    pub heading: String,
    pub synopsis: String,
    pub synopses: Vec<String>,
    pub preview: String,
    pub scene_num: Option<String>,
    pub color: Option<ratatui::style::Color>,
    pub is_section: bool,
}

impl App {
    pub fn update_index_cards(&mut self) {
        let mut cards = Vec::new();
        let mut current_card: Option<IndexCard> = None;

        for (i, (&lt, line)) in self.types.iter().zip(self.lines.iter()).enumerate() {
            if lt == LineType::SceneHeading || lt == LineType::Section {
                if let Some(mut card) = current_card.take() {
                    card.end_line = i.saturating_sub(1);
                    cards.push(card);
                }

                let is_section = lt == LineType::Section;
                let (clean_heading, scene_num) = if is_section {
                    (crate::layout::strip_sigils(line, lt).to_string(), None)
                } else if let Some(caps) = crate::layout::SCENE_NUM_RE.captures(line) {
                    (caps[1].to_string(), Some(caps[2].to_string()))
                } else {
                    (line.clone(), None)
                };

                current_card = Some(IndexCard {
                    start_line: i,
                    end_line: self.lines.len().saturating_sub(1),
                    heading: clean_heading,
                    synopsis: String::new(),
                    synopses: Vec::new(),
                    preview: String::new(),
                    scene_num,
                    color: None,
                    is_section,
                });
            } else if let Some(ref mut card) = current_card {
                if lt == LineType::Synopsis {
                    let clean_syn = crate::layout::strip_sigils(line, lt).trim().to_string();
                    card.synopses.push(clean_syn.clone());
                    if !card.synopsis.is_empty() {
                        card.synopsis.push('\n');
                    }
                    card.synopsis.push_str(&clean_syn);
                } else if card.preview.is_empty() && (lt == LineType::Action || lt == LineType::Dialogue) {
                    card.preview = line.clone();
                }
            }
        }

        if let Some(card) = current_card {
            cards.push(card);
        }

        self.index_cards = cards;
    }

    pub fn swap_cards(&mut self, i: usize, j: usize) {
        let cards = self.index_cards.clone();
        if i >= cards.len() || j >= cards.len() || i == j {
            return;
        }

        self.save_state(true);

        // Ensure i is before j for stable indexing during splice
        let (first_idx, second_idx) = if i < j { (i, j) } else { (j, i) };
        let card_a = &cards[first_idx];
        let card_b = &cards[second_idx];

        let block_a: Vec<String> = self.lines[card_a.start_line..=card_a.end_line].to_vec();
        let block_b: Vec<String> = self.lines[card_b.start_line..=card_b.end_line].to_vec();

        // Splice the second block first so the first index remains valid
        self.lines.splice(card_b.start_line..=card_b.end_line, block_a);
        self.lines.splice(card_a.start_line..=card_a.end_line, block_b);

        self.revised_lines.resize(self.lines.len(), false);
        self.dirty = true;
        self.parse_document();
        self.update_layout();
    }

    pub fn add_card(&mut self, after_idx: usize, is_section: bool) {
        self.save_state(true);
        let cards = self.index_cards.clone();
        
        let insert_line = if cards.is_empty() {
            self.lines.len()
        } else if after_idx < cards.len() {
            cards[after_idx].end_line + 1
        } else {
            self.lines.len()
        };

        // Insert a blank scene or section
        let new_lines = if is_section {
            vec![
                String::new(),
                "# UNTITLED SECTION".to_string(), 
                "= ".to_string(),
                String::new(),
            ]
        } else {
            vec![
                String::new(),
                ". UNTITLED SCENE".to_string(), 
                "= ".to_string(),
                String::new(),
            ]
        };
        
        for (i, line) in new_lines.into_iter().enumerate() {
            self.lines.insert(insert_line + i, line);
            if insert_line + i <= self.revised_lines.len() {
                self.revised_lines.insert(insert_line + i, false);
            }
        }
        self.revised_lines.resize(self.lines.len(), false);

        self.parse_document();
        self.update_layout();
        
        self.selected_card_idx = if cards.is_empty() { 0 } else { after_idx + 1 };
        self.is_card_editing = true;
        self.active_card_field = 0;
        self.is_card_field_writing = true;
        self.card_input_buffer = String::new();
    }

    pub fn delete_card(&mut self, idx: usize) {
        let cards = self.index_cards.clone();
        if idx >= cards.len() {
            return;
        }
        self.save_state(true);
        let card = &cards[idx];
        self.lines.drain(card.start_line..=card.end_line);
        if card.end_line < self.revised_lines.len() {
            let end = card.end_line.min(self.revised_lines.len().saturating_sub(1));
            self.revised_lines.drain(card.start_line..=end);
        }
        if self.lines.is_empty() {
            self.lines.push(String::new());
        }
        self.revised_lines.resize(self.lines.len(), false);
        self.parse_document();
        self.update_layout();
        self.selected_card_idx = idx.saturating_sub(1);
    }

    pub fn update_card_full(&mut self, idx: usize, heading: String, synopses: Vec<String>) {
        let cards = self.index_cards.clone();
        if idx >= cards.len() {
            return;
        }
        self.save_state(true);
        let card = &cards[idx];

        let clean_heading = if heading.is_empty() { 
            if card.is_section { "UNTITLED SECTION".to_string() } else { "UNTITLED SCENE".to_string() }
        } else { 
            heading 
        };
        
        self.lines[card.start_line] = if card.is_section {
            if clean_heading.starts_with('#') { clean_heading } else { format!("# {}", clean_heading) }
        } else {
            if clean_heading.starts_with('.') { clean_heading } else { format!(".{}", clean_heading) }
        };

        for i in (card.start_line + 1..=card.end_line).rev() {
            if i < self.types.len() && self.types[i] == LineType::Synopsis {
                self.lines.remove(i);
                if i < self.revised_lines.len() {
                    self.revised_lines.remove(i);
                }
            }
        }

        for (offset, syn) in synopses.iter().enumerate() {
            let insert_pos = card.start_line + 1 + offset;
            self.lines.insert(insert_pos, format!("= {}", syn));
            if insert_pos <= self.revised_lines.len() {
                self.revised_lines.insert(insert_pos, false);
            }
        }

        self.revised_lines.resize(self.lines.len(), false);
        self.parse_document();
        self.update_layout();
    }

    pub fn calculate_index_card_layout(&self, area: Rect) -> Vec<Rect> {
        let cards = &self.index_cards;

        let columns = 3;
        let gutter = 1;
        let card_w = (area.width.saturating_sub(4)) / columns;
        let scene_h = 10;
        let section_h = 6;

        let mut card_rects = Vec::new();
        let mut current_y = 0;
        let mut current_col = 0;

        for card in cards {
            if card.is_section {
                if current_col > 0 {
                    current_y += scene_h;
                    current_col = 0;
                }
                card_rects.push(Rect::new(2, current_y, area.width.saturating_sub(4), section_h));
                current_y += section_h + 1;
            } else {
                let x = 2 + (current_col * (card_w + gutter));
                card_rects.push(Rect::new(x, current_y, card_w, scene_h - 1));
                current_col += 1;
                if current_col >= columns {
                    current_y += scene_h;
                    current_col = 0;
                }
            }
        }
        card_rects
    }
}
