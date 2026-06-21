pub mod normal;
pub mod command;
pub mod navigation;
pub mod panes;

use std::io;
use crossterm::event::{Event, KeyEventKind, KeyModifiers, MouseButton, MouseEventKind};
use crate::app::{App, AppMode};

impl App {

    fn handle_mouse_cursor(
        &mut self,
        mouse_y: u16,
        mouse_x: u16,
        cursor_moved: &mut bool,
        update_target_x: &mut bool,
    ) {
        // Adjust for title bar (fixed at 1 line if not focus mode)
        let title_height = if !self.config.focus_mode { 1 } else { 0 };
        let vis_y = (mouse_y as usize).saturating_sub(title_height) + self.scroll;
        
        if let Some(row) = self.layout.get(vis_y) {
            self.cursor_y = row.line_idx;
            
            // Need to know if this is the last visual row for the logical line
            let is_last = self.layout.get(vis_y + 1).map(|next| next.line_idx != row.line_idx).unwrap_or(true);
            
            self.cursor_x = row.visual_to_logical_x(mouse_x, is_last);
            *cursor_moved = true;
            *update_target_x = true;
        }
    }

    pub fn handle_event(
        &mut self,
        ev: Event,
        update_target_x: &mut bool,
        text_changed: &mut bool,
        cursor_moved: &mut bool,
    ) -> io::Result<bool> {
        if let Event::Mouse(mouse_event) = ev {
            self.clear_status();
            if self.show_search_highlight {
                self.show_search_highlight = false;
            }

            match mouse_event.kind {
                MouseEventKind::ScrollUp => {
                    if self.mode == AppMode::SceneTree
                        && mouse_event.column < self.sidebar_area.x + self.sidebar_area.width
                    {
                        if self.selected_scene > 0 {
                            self.selected_scene -= 1;
                            self.tree_state.select(Some(self.selected_scene));
                            let visible = self.get_visible_scenes();
                            if let Some((item, _)) = visible.get(self.selected_scene) {
                                self.cursor_y = item.line_idx;
                                *cursor_moved = true;
                            }
                        }
                    } else {
                        self.clear_selection();
                        self.move_up();
                        *cursor_moved = true;
                    }
                }
                MouseEventKind::ScrollDown => {
                    if self.mode == AppMode::SceneTree
                        && mouse_event.column < self.sidebar_area.x + self.sidebar_area.width
                    {
                        let visible = self.get_visible_scenes();
                        if self.selected_scene + 1 < visible.len() {
                            self.selected_scene += 1;
                            self.tree_state.select(Some(self.selected_scene));
                            if let Some((item, _)) = visible.get(self.selected_scene) {
                                self.cursor_y = item.line_idx;
                                *cursor_moved = true;
                            }
                        }
                    } else {
                        self.clear_selection();
                        self.move_down();
                        *cursor_moved = true;
                    }
                }
                MouseEventKind::Down(MouseButton::Left) => {
                    if self.mode == AppMode::Normal {
                        self.clear_selection();
                        self.handle_mouse_cursor(
                            mouse_event.row,
                            mouse_event.column,
                            cursor_moved,
                            update_target_x,
                        );
                        self.selection_anchor = Some((self.cursor_y, self.cursor_x));
                    } else if self.mode == AppMode::SettingsPane {
                        let x = mouse_event.column;
                        let y = mouse_event.row;
                        if x >= self.settings_area.x
                            && x < self.settings_area.x + self.settings_area.width
                            && y >= self.settings_area.y
                            && y < self.settings_area.y + self.settings_area.height
                        {
                            let rel_y = (y - self.settings_area.y) as usize;
                            if rel_y > 0 && rel_y <= 19 {
                                let setting_idx = rel_y - 1;
                                
                                // Headers: 0, 5, 9, 12, 16
                                if [0, 5, 9, 12, 16].contains(&setting_idx) {
                                    return Ok(false);
                                }

                                self.selected_setting = setting_idx;

                                if x >= self.settings_area.x + self.settings_area.width - 5 {
                                    let desc = match self.selected_setting {
                                        1 => "Hide the UI bars for a distraction-free view.",
                                        2 => "Always center the cursor, even at the start of the file.",
                                        3 => "Display line numbers in the left gutter.",
                                        4 => "Use Nerd Font icons in the UI.",
                                        6 => "Hide Fountain markup unless the line is active.",
                                        7 => "Show production tags and markers in the layout.",
                                        8 => "Highlight the active action line.",
                                        10 => "Display scene numbers in the left margin.",
                                        11 => "Display page numbers in the right margin.",
                                        13 => "Enable scene heading/character name completion.",
                                        14 => "Automatically append (CONT'D) to character names.",
                                        15 => "Insert paragraph breaks after screenplay elements.",
                                        17 => "Periodically save the current buffer to disk.",
                                        18 => "Switch the active UI theme.",
                                        _ => "",
                                    };
                                    if !desc.is_empty() {
                                        self.set_status(desc);
                                    }
                                } else {
                                    match self.selected_setting {
                                        1 => self.config.focus_mode = !self.config.focus_mode,
                                        2 => self.config.typewriter_mode = !self.config.typewriter_mode,
                                        3 => self.config.show_line_numbers = !self.config.show_line_numbers,
                                        4 => self.config.use_nerd_fonts = !self.config.use_nerd_fonts,
                                        6 => self.config.hide_markup = !self.config.hide_markup,
                                        7 => self.config.show_production_tags = !self.config.show_production_tags,
                                        8 => self.config.highlight_active_action = !self.config.highlight_active_action,
                                        10 => self.config.show_scene_numbers = !self.config.show_scene_numbers,
                                        11 => self.config.show_page_numbers = !self.config.show_page_numbers,
                                        13 => self.config.autocomplete = !self.config.autocomplete,
                                        14 => self.config.auto_contd = !self.config.auto_contd,
                                        15 => self.config.auto_paragraph_breaks = !self.config.auto_paragraph_breaks,
                                        17 => self.config.auto_save = !self.config.auto_save,
                                        18 => self.mode = AppMode::ThemePicker,
                                        _ => {}
                                    }
                                    *text_changed = true;
                                }
                            }
                        }
                    } else if self.mode == AppMode::SceneTree {
                        // Mouse selection for tree is complex due to hierarchical structure.
                        // Disabling for now to prevent crashes/errors.
                    }
                }
                MouseEventKind::Drag(MouseButton::Left) if self.mode == AppMode::Normal => {
                    self.handle_mouse_cursor(
                        mouse_event.row,
                        mouse_event.column,
                        cursor_moved,
                        update_target_x,
                    );
                    *cursor_moved = true;
                }
                _ => {}
            }
            return Ok(false);
        }

        if let Event::Paste(text) = ev {
            if self.mode == AppMode::Normal {
                self.insert_str(&text);
                *text_changed = true;
                *cursor_moved = true;
                *update_target_x = true;
            }
            return Ok(false);
        }

        if let Event::Key(key) = ev {
            if key.kind != KeyEventKind::Press {
                return Ok(false);
            }

            let _ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
            let _shift = key.modifiers.contains(KeyModifiers::SHIFT);

            match self.mode {
                AppMode::Normal => return self.handle_normal(key, update_target_x, text_changed, cursor_moved),
                AppMode::Command | AppMode::ReplaceOne | AppMode::ReplaceAll => return self.handle_command(key, update_target_x, text_changed, cursor_moved),
                AppMode::SceneTree | AppMode::CharacterNavigator | AppMode::XRay => return self.handle_navigation(key, update_target_x, text_changed, cursor_moved),
                _ => return self.handle_panes(key, update_target_x, text_changed, cursor_moved),
            }
        }
        
        Ok(false)
    }
}
