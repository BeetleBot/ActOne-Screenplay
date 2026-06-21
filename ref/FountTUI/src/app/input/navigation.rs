use crate::app::{App, AppMode, EnsembleItem};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use std::io;

impl App {
    pub fn handle_navigation(&mut self, key: KeyEvent, update_target_x: &mut bool, _text_changed: &mut bool, cursor_moved: &mut bool) -> io::Result<bool> {
        let ctrl = key.modifiers.contains(KeyModifiers::CONTROL);
        let _shift = key.modifiers.contains(KeyModifiers::SHIFT);
        match self.mode {
                AppMode::SceneTree => {
                    match key.code {
                        KeyCode::Esc => {
                            if let Some((y, x)) = self.nav_original_pos.take() {
                                self.cursor_y = y;
                                self.cursor_x = x;
                                *cursor_moved = true;
                                *update_target_x = true;
                            }
                            self.mode = AppMode::Normal;
                            self.set_status("Cancelled");
                        }
                        KeyCode::Char('t') if ctrl => {
                            self.nav_original_pos = None;
                            self.mode = AppMode::Normal;
                        }
                        KeyCode::Char('p') if ctrl => {
                            self.mode = AppMode::SettingsPane;
                        }
                        KeyCode::Up if self.selected_scene > 0 => {
                            self.selected_scene -= 1;
                            self.tree_state.select(Some(self.selected_scene));
                            let visible = self.get_visible_scenes();
                            if let Some((item, _)) = visible.get(self.selected_scene) {
                                self.cursor_y = item.line_idx;
                                *cursor_moved = true;
                            }
                        }
                        KeyCode::Up => {}
                        KeyCode::Down => {
                            let visible = self.get_visible_scenes();
                            if self.selected_scene + 1 < visible.len() {
                                self.selected_scene += 1;
                                self.tree_state.select(Some(self.selected_scene));
                                if let Some((item, _)) = visible.get(self.selected_scene) {
                                    self.cursor_y = item.line_idx;
                                    *cursor_moved = true;
                                }
                            }
                        }
                        KeyCode::Left => {}
                        KeyCode::Right => {}
                        KeyCode::Tab | KeyCode::Enter => {
                            let visible = self.get_visible_scenes();
                            if let Some((item, _)) = visible.get(self.selected_scene) {
                                if item.is_section && key.code == KeyCode::Tab {
                                    if self.collapsed_sections.contains(&item.line_idx) {
                                        self.collapsed_sections.remove(&item.line_idx);
                                    } else {
                                        self.collapsed_sections.insert(item.line_idx);
                                    }
                                } else if key.code == KeyCode::Enter || !item.is_section {
                                    let target_line = item.line_idx;
                                    self.cursor_y = target_line;
                                    self.cursor_x = 0;
                                    self.mode = AppMode::Normal;
                                    self.nav_original_pos = None;
                                    *cursor_moved = true;
                                    *update_target_x = true;
                                }
                            }
                        }
                        _ => {}
                    }
                    return Ok(false);
                }
                AppMode::CharacterNavigator => {
                    match key.code {
                        KeyCode::Esc => {
                            if let Some((y, x)) = self.nav_original_pos.take() {
                                self.cursor_y = y;
                                self.cursor_x = x;
                                *cursor_moved = true;
                                *update_target_x = true;
                            }
                            self.mode = AppMode::Normal;
                        }
                        KeyCode::Up => {
                            let mut next = self.selected_ensemble_idx;
                            while next > 0 {
                                next -= 1;
                                match self.ensemble_items[next] {
                                    EnsembleItem::CharacterHeader(_) | EnsembleItem::SceneLink(..) => {
                                        self.selected_ensemble_idx = next;
                                        self.ensemble_state.select(Some(self.selected_ensemble_idx));
                                        
                                        if let EnsembleItem::SceneLink(_, line_idx, _) = self.ensemble_items[next] {
                                            self.cursor_y = line_idx;
                                            self.cursor_x = 0;
                                            *cursor_moved = true;
                                            *update_target_x = true;
                                        }
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                        }
                        KeyCode::Down => {
                            let mut next = self.selected_ensemble_idx;
                            while next + 1 < self.ensemble_items.len() {
                                next += 1;
                                match self.ensemble_items[next] {
                                    EnsembleItem::CharacterHeader(_) | EnsembleItem::SceneLink(..) => {
                                        self.selected_ensemble_idx = next;
                                        self.ensemble_state.select(Some(self.selected_ensemble_idx));
 
                                        if let EnsembleItem::SceneLink(_, line_idx, _) = self.ensemble_items[next] {
                                            self.cursor_y = line_idx;
                                            self.cursor_x = 0;
                                            *cursor_moved = true;
                                            *update_target_x = true;
                                        }
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                        }
                        KeyCode::Tab | KeyCode::Char(' ') => {
                            if let EnsembleItem::CharacterHeader(char_idx) = self.ensemble_items[self.selected_ensemble_idx] {
                                self.character_stats[char_idx].is_expanded = !self.character_stats[char_idx].is_expanded;
                                self.refresh_ensemble_list();
                                self.selected_ensemble_idx = self.ensemble_items.iter().position(|item| {
                                    if let EnsembleItem::CharacterHeader(idx) = item {
                                        *idx == char_idx
                                    } else {
                                        false
                                    }
                                }).unwrap_or(0);
                                self.ensemble_state.select(Some(self.selected_ensemble_idx));
                            }
                        }
                        KeyCode::Enter => {
                            match &self.ensemble_items[self.selected_ensemble_idx] {
                                EnsembleItem::CharacterHeader(char_idx) => {
                                    let item = &self.character_stats[*char_idx];
                                    if let Some((_, line_idx)) = item.appears_in_scenes.first() {
                                        self.cursor_y = *line_idx;
                                        self.cursor_x = 0;
                                        self.mode = AppMode::Normal;
                                        self.nav_original_pos = None;
                                        *cursor_moved = true;
                                        *update_target_x = true;
                                    }
                                }
                                EnsembleItem::SceneLink(_, line_idx, _) => {
                                    self.cursor_y = *line_idx;
                                    self.cursor_x = 0;
                                    self.mode = AppMode::Normal;
                                    self.nav_original_pos = None;
                                    *cursor_moved = true;
                                    *update_target_x = true;
                                }
                                _ => {}
                            }
                        }
                        _ => {}
                    }
                    return Ok(false);
                }
                AppMode::XRay => {
                    match key.code {
                        KeyCode::Esc => {
                            self.mode = AppMode::Normal;
                        }
                        KeyCode::Tab if self.xray_tab == 3 => {
                            self.xray_breakdown_idx = (self.xray_breakdown_idx + 1) % 2;
                            self.xray_scroll = 0;
                        }
                        KeyCode::BackTab if self.xray_tab == 3 => {
                            self.xray_breakdown_idx = (self.xray_breakdown_idx + 1) % 2;
                            self.xray_scroll = 0;
                        }
                        KeyCode::Char('1') => { self.xray_tab = 0; self.xray_scroll = 0; }
                        KeyCode::Char('2') => { self.xray_tab = 1; self.xray_scroll = 0; }
                        KeyCode::Char('3') => { self.xray_tab = 2; self.xray_scroll = 0; }
                        KeyCode::Char('4') => { self.xray_tab = 3; self.xray_scroll = 0; }
                        KeyCode::Up => {
                            self.xray_scroll = self.xray_scroll.saturating_sub(1);
                        }
                        KeyCode::Down => {
                            self.xray_scroll = self.xray_scroll.saturating_add(1);
                        }
                        _ => {}
                    }
                    return Ok(false);
                }
                _ => {}
        }
        Ok(false)
    }
}
