use crate::app::{App, AppMode};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use std::io;

impl App {
    pub fn handle_command(&mut self, key: KeyEvent, update_target_x: &mut bool, text_changed: &mut bool, cursor_moved: &mut bool) -> io::Result<bool> {
        let _ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
        let _shift = key.modifiers.contains(KeyModifiers::SHIFT);
        
        match key.code {
            KeyCode::Esc => {
                self.mode = AppMode::Normal;
                self.command_input.clear();
                self.command_error = false;
            }
            KeyCode::Tab if self.mode == AppMode::Command => {
                let commands = self.get_command_completions();
                let input_lower = self.command_input.to_lowercase();
                let matches: Vec<&String> = commands.iter()
                    .filter(|c| c.to_lowercase().starts_with(&input_lower))
                    .collect();
                
                if !matches.is_empty() {
                    // Basic cycling
                    let current = &self.command_input;
                    if let Some(pos) = matches.iter().position(|m| *m == current) {
                        self.command_input = matches[(pos + 1) % matches.len()].to_string();
                    } else {
                        self.command_input = matches[0].to_string();
                    }
                }
            }
            KeyCode::Right if self.mode == AppMode::Command && !self.command_input.is_empty() => {
                let commands = self.get_command_completions();
                let input_lower = self.command_input.to_lowercase();
                if let Some(first_match) = commands.iter().find(|&c| c.to_lowercase().starts_with(&input_lower) && c.to_lowercase() != input_lower) {
                    self.command_input = first_match.to_string();
                }
            }
            KeyCode::Backspace => {
                self.command_input.pop();
                if self.command_input.is_empty() {
                    self.mode = AppMode::Normal;
                }
                self.command_error = false;
            }
            KeyCode::Enter => {
                if self.mode == AppMode::ReplaceOne {
                    let replacement = self.command_input.clone();
                    self.command_input.clear();
                    self.mode = AppMode::Normal;
                    if self.replace_current_match(&replacement) {
                        self.set_status(&format!("Replaced with \"{}\"", replacement));
                    }
                    *text_changed = true;
                    *cursor_moved = true;
                    *update_target_x = true;
                    return Ok(false);
                } else if self.mode == AppMode::ReplaceAll {
                    let replacement = self.command_input.clone();
                    self.command_input.clear();
                    self.mode = AppMode::Normal;
                    let count = self.replace_all_matches(&replacement);
                    self.set_status(&format!("Replaced {} occurrences with \"{}\"", count, replacement));
                    *text_changed = true;
                    *cursor_moved = true;
                    *update_target_x = true;
                    return Ok(false);
                }

                match self.execute_command(text_changed, cursor_moved, update_target_x) {
                    Ok(true) => return Ok(true),
                    Ok(false) => {}
                    Err(e) => self.set_error(&format!("Command error: {}", e)),
                }
            }
            KeyCode::Char('/') if self.command_input.is_empty() && self.mode == AppMode::Command => {
                self.mode = AppMode::Normal;
                self.insert_char('/');
                *text_changed = true;
                *cursor_moved = true;
                *update_target_x = true;
            }
            KeyCode::Char(c) => {
                self.command_input.push(c);
                self.command_error = false;
            }
            _ => {}
        }
        Ok(false)
    }
}
