use crate::app::App;
use ratatui::{
    Frame,
    layout::{Rect, Layout, Constraint, Direction},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, Clear, Paragraph, List, ListItem},
};

pub fn draw_structure_picker(f: &mut Frame, app: &mut App) {
    let area = f.area();
    let theme = &app.theme;
    let accent = Color::from(theme.ui.normal_mode_bg.clone());
    let sel_bg = Color::from(theme.ui.selection_bg.clone());
    let sel_fg = Color::from(theme.ui.selection_fg.clone());
    let normal_fg = theme.primary_fg();
    let normal_bg = theme.primary_bg();

    let modal_w = 80u16.min(area.width.saturating_sub(4));
    let modal_h = 24u16.min(area.height.saturating_sub(4));
    let x = area.x + (area.width.saturating_sub(modal_w)) / 2;
    let y = area.y + (area.height.saturating_sub(modal_h)) / 2;
    let modal_area = Rect::new(x, y, modal_w, modal_h);

    f.render_widget(Clear, modal_area);

    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(accent))
        .style(Style::default().bg(normal_bg).fg(normal_fg))
        .title_top(Span::styled(
            " [ select structure ] ",
            Style::default().fg(accent).add_modifier(Modifier::BOLD),
        ))
        .title_bottom(ratatui::text::Line::from(Span::styled(
            if app.previous_mode == crate::app::AppMode::Home {
                " [Enter] Open in new buffer "
            } else {
                " [Enter] Import into current buffer  [Shift+Enter] Open in new buffer "
            },
            Style::default().fg(accent),
        )).centered());
    f.render_widget(block, modal_area);

    let inner = modal_area.inner(ratatui::layout::Margin {
        horizontal: 2,
        vertical: 1,
    });

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(40),
            Constraint::Length(1),
            Constraint::Percentage(60),
        ])
        .split(inner);

    let left_area = chunks[0];
    let sep_area = chunks[1];
    let right_area = chunks[2];

    // Left: List of structures
    let items: Vec<ListItem> = app.structures.iter().enumerate().map(|(i, s)| {
        let is_sel = i == app.structure_selected;
        if is_sel {
            ListItem::new(format!(
                " {} {}",
                if app.config.use_nerd_fonts { "󰁔" } else { "▸" },
                s.name
            ))
            .style(Style::default().fg(sel_fg).bg(sel_bg).add_modifier(Modifier::BOLD))
        } else {
            ListItem::new(format!("   {}", s.name))
                .style(Style::default().fg(normal_fg))
        }
    }).collect();

    f.render_widget(List::new(items), left_area);

    // Separator
    let sep_lines: Vec<Line> = (0..sep_area.height)
        .map(|_| Line::from(Span::styled("│", Style::default().fg(accent).add_modifier(Modifier::DIM))))
        .collect();
    f.render_widget(Paragraph::new(sep_lines), sep_area);

    // Right: Preview
    if let Some(s) = app.structures.get(app.structure_selected) {
        let mut lines = Vec::new();
        lines.push(Line::from(Span::styled(s.name.clone(), Style::default().fg(accent).add_modifier(Modifier::BOLD))));
        lines.push(Line::from(""));
        
        if !s.description.is_empty() {
            lines.push(Line::from(Span::styled(s.description.clone(), Style::default().fg(normal_fg).add_modifier(Modifier::ITALIC))));
            lines.push(Line::from(""));
        }

        lines.push(Line::from(Span::styled("Beats:", Style::default().fg(accent).add_modifier(Modifier::UNDERLINED))));
        for beat in &s.beats {
            lines.push(Line::from(vec![
                Span::styled(
                    if app.config.use_nerd_fonts { " 󰄱 " } else { " • " },
                    Style::default().fg(accent)
                ),
                Span::styled(beat.label.clone(), Style::default().fg(normal_fg).add_modifier(Modifier::BOLD)),
            ]));
        }

        f.render_widget(Paragraph::new(lines).wrap(ratatui::widgets::Wrap { trim: true }), right_area);
    }
}
