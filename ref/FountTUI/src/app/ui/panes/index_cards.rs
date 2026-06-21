use crate::app::App;
use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, Clear, Paragraph, Wrap},
};

pub fn draw_index_cards(f: &mut Frame, app: &mut App, area: Rect) {
    let theme = &app.theme;
    let accent = Color::from(theme.ui.normal_mode_bg.clone());
    let normal_fg = theme.primary_fg();
    let bg_color = theme.primary_bg();
    
    let section_color = theme.syntax.section.clone()
        .map(Color::from)
        .unwrap_or(accent);

    let cards = &app.index_cards;
    if cards.is_empty() {
        return;
    }

    let card_rects = app.calculate_index_card_layout(area);

    let selected_rect = card_rects[app.selected_card_idx.min(card_rects.len()-1)];
    let view_height = area.height;
    
    if selected_rect.y < app.card_row_offset as u16 {
        app.card_row_offset = selected_rect.y as usize;
    } else if selected_rect.y + selected_rect.height > (app.card_row_offset as u16 + view_height) {
        app.card_row_offset = (selected_rect.y + selected_rect.height - view_height) as usize;
    }

    for (i, (card, &raw_rect)) in cards.iter().zip(card_rects.iter()).enumerate() {
        let relative_y = raw_rect.y as i32 - app.card_row_offset as i32;
        
        if relative_y + raw_rect.height as i32 <= 0 || relative_y >= view_height as i32 {
            continue;
        }

        let mut draw_y = area.y as i32 + relative_y;
        let mut draw_h = raw_rect.height as i32;

        if draw_y < area.y as i32 {
            let diff = area.y as i32 - draw_y;
            draw_h -= diff;
            draw_y = area.y as i32;
        }

        if draw_y + draw_h > (area.y + area.height) as i32 {
            draw_h = (area.y + area.height) as i32 - draw_y;
        }
        
        if draw_h <= 0 {
            continue;
        }

        let card_rect = Rect::new(
            area.x + raw_rect.x,
            draw_y as u16,
            raw_rect.width,
            draw_h as u16
        );

        let is_selected = i == app.selected_card_idx;
        let base_style = Style::default().bg(bg_color);
        
        if card.is_section {
            let mut border_style = Style::default().fg(section_color);
            if is_selected {
                if app.card_is_moving {
                    border_style = theme.warning_style().add_modifier(Modifier::BOLD);
                } else {
                    border_style = border_style.fg(accent).add_modifier(Modifier::BOLD);
                }
            }
            
            let borders = Borders::ALL;

            let border_type = if is_selected {
                if app.card_is_moving {
                    BorderType::Thick
                } else {
                    BorderType::Double
                }
            } else {
                BorderType::Rounded
            };

            let block = Block::default()
                .borders(borders)
                .border_type(border_type)
                .border_style(border_style)
                .style(base_style);
            
            f.render_widget(block, card_rect);

            let label_text = if is_selected && app.card_is_moving {
                " SECTION [MOVING] "
            } else {
                " SECTION "
            };
            let tab_rect = Rect::new(card_rect.x + 1, card_rect.y, label_text.len() as u16, 1);
            f.render_widget(Paragraph::new(Line::from(vec![
                Span::styled(label_text, border_style),
            ])), tab_rect);

            let inner = Rect::new(card_rect.x + 2, card_rect.y + 1, card_rect.width.saturating_sub(4), card_rect.height.saturating_sub(2));
            let mut lines = Vec::new();
            
            let heading_text = card.heading.to_uppercase();
            lines.push(Line::from(Span::styled(heading_text, Style::default().fg(section_color).add_modifier(Modifier::BOLD))));
            
            if card.synopses.is_empty() {
                lines.push(Line::from(Span::styled("Empty section...", Style::default().fg(normal_fg).add_modifier(Modifier::ITALIC))));
            } else {
                lines.push(Line::from(""));
                let limit = inner.width.saturating_sub(4) as usize;
                let synopsis_style = {
                    let color = if let Some(ref c) = theme.syntax.synopsis {
                        Color::from(c.clone())
                    } else {
                        normal_fg
                    };
                    Style::default().fg(color).add_modifier(Modifier::BOLD)
                };
                for syn in &card.synopses {
                    let display_syn = if syn.chars().count() > limit {
                        let mut s: String = syn.chars().take(limit.saturating_sub(3)).collect();
                        s.push_str("...");
                        s
                    } else {
                        syn.clone()
                    };
                    let bullet_line = format!("  • {}", display_syn);
                    lines.push(Line::from(Span::styled(bullet_line, synopsis_style)));
                }
            }
            
            f.render_widget(Paragraph::new(lines).wrap(Wrap { trim: true }), inner);

        } else {
            let mut border_style = theme.secondary_style();
            if is_selected {
                if app.card_is_moving {
                    border_style = theme.warning_style().add_modifier(Modifier::BOLD);
                } else {
                    border_style = Style::default().fg(accent).add_modifier(Modifier::BOLD);
                }
            }
            
            let borders = Borders::ALL;

            let border_type = if is_selected {
                if app.card_is_moving {
                    BorderType::Thick
                } else {
                    BorderType::Double
                }
            } else {
                BorderType::Rounded
            };

            let block = Block::default()
                .borders(borders)
                .border_type(border_type)
                .border_style(border_style)
                .style(base_style);
                
            f.render_widget(block, card_rect);
            
            let header_bar_rect = Rect::new(card_rect.x + 1, card_rect.y, card_rect.width.saturating_sub(2), 1.min(card_rect.height));
            let header_label = if let Some(ref num) = card.scene_num {
                if is_selected && app.card_is_moving {
                    format!(" SCENE {} [MOVING] ", num)
                } else {
                    format!(" SCENE {} ", num)
                }
            } else {
                if is_selected && app.card_is_moving {
                    " SCENE [MOVING] ".to_string()
                } else {
                    " SCENE ".to_string()
                }
            };

            let label_style = if is_selected && app.card_is_moving {
                theme.warning_style().add_modifier(Modifier::BOLD)
            } else if let Some(c) = card.color { 
                Style::default().fg(c).add_modifier(Modifier::BOLD)
            } else { 
                Style::default().fg(accent).add_modifier(Modifier::BOLD)
            };
            
            f.render_widget(Paragraph::new(Line::from(vec![
                Span::styled(header_label, label_style),
            ])), header_bar_rect);

            let inner = Rect::new(card_rect.x + 1, card_rect.y + 1, card_rect.width.saturating_sub(2), card_rect.height.saturating_sub(2));
            let mut card_lines = Vec::new();
            
            let heading_content = {
                let h = card.heading.trim_start_matches('.').to_string();
                if h.is_empty() { "[No Heading]".to_string() } else { h }
            };
            
            let heading_style = Style::default().fg(normal_fg).add_modifier(Modifier::BOLD);
            card_lines.push(Line::from(Span::styled(heading_content, if let Some(c) = card.color { heading_style.fg(c) } else { heading_style })));
            
            if !card.synopses.is_empty() {
                card_lines.push(Line::from(""));
                let limit = inner.width.saturating_sub(4) as usize;
                let synopsis_style = {
                    let color = if let Some(ref c) = theme.syntax.synopsis {
                        Color::from(c.clone())
                    } else {
                        normal_fg
                    };
                    Style::default().fg(color).add_modifier(Modifier::BOLD)
                };
                for syn in &card.synopses {
                    let display_syn = if syn.chars().count() > limit {
                        let mut s: String = syn.chars().take(limit.saturating_sub(3)).collect();
                        s.push_str("...");
                        s
                    } else {
                        syn.clone()
                    };
                    let bullet_line = format!("  • {}", display_syn);
                    card_lines.push(Line::from(Span::styled(bullet_line, synopsis_style)));
                }
            } else if !card.preview.is_empty() {
                let limit = inner.width as usize;
                let display_prev = if card.preview.chars().count() > limit {
                    let mut s: String = card.preview.chars().take(limit.saturating_sub(3)).collect();
                    s.push_str("...");
                    s
                } else {
                    card.preview.clone()
                };
                card_lines.push(Line::from(Span::styled(display_prev, theme.secondary_style().add_modifier(Modifier::ITALIC))));
            } else {
                card_lines.push(Line::from(Span::styled("Plan...", theme.secondary_style().add_modifier(Modifier::ITALIC))));
            }
            
            f.render_widget(Paragraph::new(card_lines).wrap(Wrap { trim: true }), inner);
        }
    }

    let help_hint = Span::styled(" [?] Help ", Style::default().fg(accent).add_modifier(Modifier::BOLD));
    let hint_w = 10;
    let hint_area = Rect::new(
        area.x + area.width.saturating_sub(hint_w + 2),
        area.y + area.height.saturating_sub(1),
        hint_w,
        1
    );
    f.render_widget(Paragraph::new(Line::from(help_hint)), hint_area);

    if let Some(card) = if app.is_card_editing { app.index_cards.get(app.selected_card_idx) } else { None } {
        let area_modal = crate::app::ui::panes::centered_rect(65, 75, area);
            f.render_widget(Clear, area_modal);

            let modal_block = Block::default()
                .borders(Borders::ALL)
                .border_type(BorderType::Double)
                .border_style(Style::default().fg(accent).add_modifier(Modifier::BOLD))
                .title(if card.is_section { " SECTION OUTLINE & DETAILS " } else { " SCENE OUTLINE & DETAILS " })
                .style(Style::default().bg(bg_color));
            
            f.render_widget(modal_block.clone(), area_modal);
            let inner_modal = modal_block.inner(area_modal);

            let modal_layout = Layout::default()
                .direction(ratatui::layout::Direction::Vertical)
                .constraints([
                    Constraint::Length(1),
                    Constraint::Min(5),
                    Constraint::Length(2),
                ])
                .split(inner_modal);

            let total_fields = 1 + card.synopses.len();
            let mut heights = Vec::new();
            let modal_width = modal_layout[1].width;
            
            for f_idx in 0..total_fields {
                let text = if f_idx == 0 {
                    &card.heading
                } else {
                    card.synopses.get(f_idx - 1).map(|s| s.as_str()).unwrap_or("")
                };
                let active_text = if f_idx == app.active_card_field && app.is_card_field_writing {
                    &app.card_input_buffer
                } else {
                    text
                };
                let h = {
                    let inner_w = modal_width.saturating_sub(2);
                    let char_count = active_text.chars().count();
                    let lines = if inner_w > 0 {
                        (char_count as u16).div_ceil(inner_w)
                    } else {
                        1
                    };
                    let lines = if lines == 0 { 1 } else { lines };
                    2 + lines
                };
                heights.push(h);
            }
            
            let viewport_height = modal_layout[1].height;
            let mut start_field = 0;
            
            loop {
                let sum: u16 = heights[start_field..=app.active_card_field].iter().sum();
                if sum <= viewport_height || start_field >= app.active_card_field {
                    break;
                }
                start_field += 1;
            }

            let mut visible_heights = Vec::new();
            let mut visible_indices = Vec::new();
            let mut sum_height = 0;
            
            for (f_idx, &h) in heights.iter().enumerate().take(total_fields).skip(start_field) {
                if sum_height + h > viewport_height {
                    if visible_heights.is_empty() {
                        visible_heights.push(viewport_height);
                        visible_indices.push(f_idx);
                    }
                    break;
                }
                sum_height += h;
                visible_heights.push(h);
                visible_indices.push(f_idx);
            }
            
            let field_constraints: Vec<Constraint> = visible_heights.iter().map(|&h| Constraint::Length(h)).collect();
            let field_rects = Layout::default()
                .direction(ratatui::layout::Direction::Vertical)
                .constraints(field_constraints)
                .split(modal_layout[1]);

            for (v_idx, &actual_idx) in visible_indices.iter().enumerate() {
                if v_idx >= field_rects.len() {
                    break;
                }
                
                let rect = field_rects[v_idx];
                let is_selected = actual_idx == app.active_card_field;
                let is_writing = is_selected && app.is_card_field_writing;
                
                let field_block_style = if is_writing {
                    theme.warning_style().add_modifier(Modifier::BOLD)
                } else if is_selected {
                    Style::default().fg(accent).add_modifier(Modifier::BOLD)
                } else {
                    theme.secondary_style().add_modifier(Modifier::DIM)
                };

                let field_title = if actual_idx == 0 {
                    " Heading ".to_string()
                } else {
                    format!(" Synopsis {} ", actual_idx)
                };

                let field_block = Block::default()
                    .borders(Borders::ALL)
                    .border_type(if is_selected { BorderType::Double } else { BorderType::Rounded })
                    .border_style(field_block_style)
                    .title(field_title);

                let field_content = if is_writing {
                    format!("{}|", app.card_input_buffer)
                } else if actual_idx == 0 {
                    card.heading.clone()
                } else {
                    card.synopses.get(actual_idx - 1).cloned().unwrap_or_default()
                };

                let text_style = if is_selected {
                    Style::default().fg(normal_fg)
                } else {
                    theme.secondary_style()
                };

                f.render_widget(Paragraph::new(field_content).style(text_style).block(field_block).wrap(Wrap { trim: true }), rect);
            }

            let footer_hint = Line::from(vec![
                Span::raw(" [↑/↓] Navigate "),
                Span::raw(" [Enter] Edit/Save "),
                Span::raw(" [s] Add Synopsis "),
                Span::raw(" [d] Delete Synopsis "),
                Span::raw(" [Esc] Close "),
            ]);
            f.render_widget(Paragraph::new(footer_hint).style(Style::default().fg(theme.secondary_style().fg.unwrap_or(Color::Gray))), modal_layout[2]);
        }
}
