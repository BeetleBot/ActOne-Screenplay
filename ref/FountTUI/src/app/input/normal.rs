use crate::app::{App, AppMode};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use std::io;

impl App {
    pub fn handle_normal(&mut self, key: KeyEvent, update_target_x: &mut bool, text_changed: &mut bool, cursor_moved: &mut bool) -> io::Result<bool> {
        let ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
        let shift = key.modifiers.contains(KeyModifiers::SHIFT);
        
        self.clear_status();

        if self.show_search_highlight {
            match key.code {
                KeyCode::Char('w') if ctrl => {}
                KeyCode::Char('c') if ctrl => {}
                KeyCode::Char('r') if !ctrl && !shift => {
                    self.mode = AppMode::ReplaceOne;
                    self.command_input.clear();
                    return Ok(false);
                }
                KeyCode::Char('R') if !ctrl && shift => {
                    self.mode = AppMode::ReplaceAll;
                    self.command_input.clear();
                    return Ok(false);
                }
                _ => {
                    self.show_search_highlight = false;
                    *text_changed = true;
                }
            }
        }

        match key.code {
            KeyCode::Esc => {}

            KeyCode::Left if ctrl => {
                self.move_word_left();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::Right if ctrl => {
                self.move_word_right();
                *update_target_x = true;
                *cursor_moved = true;
            }

            KeyCode::Backspace if ctrl => {
                self.delete_word_back();
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::Delete if ctrl => {
                self.delete_word_forward();
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }

            KeyCode::Char('t') if ctrl => {
                self.open_scene_tree();
            }
            KeyCode::Char('l') if ctrl => {
                self.open_character_sidebar();
            }
            KeyCode::Char('p') if ctrl => {
                self.mode = AppMode::SettingsPane;
                self.selected_setting = 0;
            }
            KeyCode::Char('f') if ctrl => {
                self.mode = AppMode::Search;
                self.search_query.clear();
                self.show_search_highlight = true;
                self.update_search_regex();
            }
            KeyCode::Char('s') if ctrl => {
                if self.file.is_some() {
                    if let Err(e) = self.save() {
                        self.set_error(&format!("Error saving: {}", e));
                    }
                } else {
                    self.open_file_picker(
                        crate::app::FilePickerAction::Save,
                        vec!["fountain".to_string()],
                        Some("unnamed.fountain".to_string()),
                    );
                }
            }
            KeyCode::Char('o') if ctrl => {
                self.open_file_picker(
                    crate::app::FilePickerAction::Open,
                    vec!["fountain".to_string()],
                    None,
                );
            }
            KeyCode::Char('n') if ctrl => {
                let lines = vec![String::new()];
                let revised_lines = vec![false; lines.len()];
                let new_buf = crate::app::BufferState {
                    lines,
                    revised_lines,
                    ..Default::default()
                };
                self.buffers.push(new_buf);
                let new_idx = self.buffers.len() - 1;
                self.has_multiple_buffers = true;
                self.switch_buffer(new_idx);
                self.set_status("New file opened");
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::Char('/') => {
                if key.modifiers.contains(KeyModifiers::ALT) {
                    if !self.last_command.is_empty() {
                        self.mode = AppMode::Command;
                        self.command_input = self.last_command.clone();
                        self.command_error = false;
                    }
                } else {
                    self.previous_mode = self.mode;
                    self.mode = AppMode::Command;
                    self.command_input.clear();
                    self.command_error = false;
                }
            }
            KeyCode::Char('e') if ctrl => {
                self.mode = AppMode::ExportPane;
                self.selected_export_option = 0;
            }
            KeyCode::Char('z') if ctrl && shift && self.redo() => {
                self.set_status("Redo applied");
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::Char('z') if ctrl && self.undo() => {
                self.set_status("Undo applied");
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }

            KeyCode::Char('a') if ctrl => {
                self.select_all();
                *cursor_moved = true;
            }
            KeyCode::Char('c') if ctrl => {
                self.copy_to_clipboard();
            }
            KeyCode::Char('x') if ctrl => {
                if self.selection_anchor.is_some() {
                    self.cut_to_clipboard();
                } else {
                    self.cut_line();
                    self.set_status("Line cut");
                }
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::Char('v') if ctrl => {
                self.paste_from_clipboard();
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::F(1) => {
                self.mode = AppMode::Shortcuts;
            }
            KeyCode::Up if shift => {
                if self.selection_anchor.is_none() {
                    self.selection_anchor = Some((self.cursor_y, self.cursor_x));
                }
                self.move_up();
                *cursor_moved = true;
            }
            KeyCode::Up if key.modifiers.contains(KeyModifiers::ALT) => {
                self.jump_to_match(false);
                *cursor_moved = true;
                *update_target_x = true;
            }
            KeyCode::Down if shift => {
                if self.selection_anchor.is_none() {
                    self.selection_anchor = Some((self.cursor_y, self.cursor_x));
                }
                self.move_down();
                *cursor_moved = true;
            }
            KeyCode::Down if key.modifiers.contains(KeyModifiers::ALT) => {
                self.jump_to_match(true);
                *cursor_moved = true;
                *update_target_x = true;
            }
            KeyCode::Left if shift => {
                if self.selection_anchor.is_none() {
                    self.selection_anchor = Some((self.cursor_y, self.cursor_x));
                }
                self.move_left();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::Right if shift => {
                if self.selection_anchor.is_none() {
                    self.selection_anchor = Some((self.cursor_y, self.cursor_x));
                }
                self.move_right();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::Home if shift => {
                if self.selection_anchor.is_none() {
                    self.selection_anchor = Some((self.cursor_y, self.cursor_x));
                }
                self.move_home();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::End if shift => {
                if self.selection_anchor.is_none() {
                    self.selection_anchor = Some((self.cursor_y, self.cursor_x));
                }
                self.move_end();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::Up => {
                self.clear_selection();
                self.move_up();
                *cursor_moved = true;
            }
            KeyCode::Down => {
                self.clear_selection();
                self.move_down();
                *cursor_moved = true;
            }
            KeyCode::Left => {
                self.clear_selection();
                self.move_left();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::Right => {
                self.clear_selection();
                self.move_right();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::PageUp if ctrl => {
                self.switch_prev_buffer();
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::PageUp => {
                self.move_page_up();
                *cursor_moved = true;
            }
            KeyCode::PageDown if ctrl => {
                self.switch_next_buffer();
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::PageDown => {
                self.move_page_down();
                *cursor_moved = true;
            }
            KeyCode::Home if ctrl => {
                self.move_to_top();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::Home => {
                self.move_home();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::End if ctrl => {
                self.move_to_bottom();
                *update_target_x = true;
                *cursor_moved = true;
            }
            KeyCode::End => {
                self.move_end();
                *update_target_x = true;
                *cursor_moved = true;
            }

            KeyCode::Enter => {
                self.suggestion = None;
                self.insert_newline(shift);
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::Backspace => {
                if self.selection_anchor.is_some() {
                    self.delete_selection();
                    self.parse_document();
                } else {
                    self.backspace();
                }
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::Delete => {
                if self.selection_anchor.is_some() {
                    self.delete_selection();
                    self.parse_document();
                } else {
                    self.delete_forward();
                }
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::Tab => {
                self.handle_tab();
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;
            }
            KeyCode::Char(c) if !ctrl => {
                if self.selection_anchor.is_some() {
                    self.delete_selection();
                    self.parse_document();
                }
                self.insert_char(c);
                *update_target_x = true;
                *text_changed = true;
                *cursor_moved = true;

                if c == '[' && self.cursor_x >= 2 {
                    let line = &self.lines[self.cursor_y];
                    let chars: Vec<char> = line.chars().collect();
                    if chars[self.cursor_x - 1] == '[' && chars[self.cursor_x - 2] == '[' {
                        self.trigger_metadata_autocomplete();
                    }
                }
            }
            _ => {}
        }
        Ok(false)
    }
}
