use crate::app::{App, XRayData};
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect, Alignment},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, Paragraph},
};

pub fn draw_inventory(f: &mut Frame, area: Rect, app: &App, data: &XRayData) {
    let theme = &app.theme;
    let accent = Color::from(theme.ui.tree_mode_bg.clone());
    let dim = Color::from(theme.ui.dim.clone());
    let nerd = app.config.use_nerd_fonts;
    let active_pane = app.xray_breakdown_idx;

    if data.global_breakdown.is_empty() && data.scene_breakdown.is_empty() {
        let msg = if nerd {
            "󰉏  No production tags found.\n\n  Use [[Department:Item]] syntax in your script\n  to track props, wardrobe, vehicles, and more."
        } else {
            "No production tags found.\n\n  Use [[Department:Item]] syntax in your script\n  to track props, wardrobe, vehicles, and more."
        };
        f.render_widget(
            Paragraph::new(msg)
                .alignment(Alignment::Center)
                .style(theme.secondary_style()),
            area,
        );
        return;
    }

    let total_assets: usize = data.global_breakdown.values().map(|v| v.len()).sum();

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(0),
        ])
        .split(area);

    let summary = vec![
        Line::from(""),
        Line::from(vec![
            Span::styled(
                if nerd { "  󰉏 PRODUCTION INVENTORY " } else { "  PRODUCTION INVENTORY " },
                Style::default().fg(accent).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!(" {} total tags across {} scenes ", total_assets, data.scene_breakdown.len()),
                theme.secondary_style(),
            ),
        ]),
    ];
    f.render_widget(Paragraph::new(summary), chunks[0]);

    let content_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(50),
            Constraint::Percentage(50),
        ])
        .split(chunks[1]);

    // Build Scene Breakdown lines
    let scene_icon = if nerd { "󰉅" } else { "#" };
    let item_icon = if nerd { "󰄱" } else { "-" };
    let mut scene_lines = Vec::new();
    for sb in &data.scene_breakdown {
        if sb.breakdown.is_empty() {
            continue;
        }
        let scene_label = sb.scene_num.as_deref().unwrap_or("-");
        scene_lines.push(Line::from(vec![
            Span::styled(
                format!("  {} {} — {}  ", scene_icon, scene_label, sb.label),
                Style::default()
                    .fg(Color::from(theme.ui.selection_fg.clone()))
                    .bg(Color::from(theme.ui.selection_bg.clone()))
                    .add_modifier(Modifier::BOLD),
            ),
        ]));

        for (dept, items) in &sb.breakdown {
            for item in items {
                scene_lines.push(Line::from(vec![
                    Span::styled(format!("  {} ", item_icon), Style::default().fg(accent)),
                    Span::styled(format!("{}: ", dept), Style::default().fg(dim)),
                    Span::styled(item.as_str(), Style::default().fg(theme.primary_fg())),
                ]));
            }
        }
        scene_lines.push(Line::from(""));
    }

    // Build Global Tags lines
    let mut global_lines = Vec::new();
    for (key, values) in &data.global_breakdown {
        global_lines.push(Line::from(vec![
            Span::styled(
                format!("  {}  ", key.to_uppercase()),
                Style::default()
                    .fg(Color::from(theme.ui.selection_fg.clone()))
                    .bg(Color::from(theme.ui.selection_bg.clone()))
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(format!("  {} items", values.len()), theme.secondary_style()),
        ]));

        for val in values {
            global_lines.push(Line::from(vec![
                Span::styled(format!("  {} ", item_icon), Style::default().fg(accent)),
                Span::styled(val.as_str(), Style::default().fg(theme.primary_fg())),
            ]));
        }
        global_lines.push(Line::from(""));
    }

    let pane_height = content_chunks[0].height.saturating_sub(2) as usize;
    
    // Calculate scroll for Scene Breakdown
    let scene_max_scroll = scene_lines.len().saturating_sub(pane_height);
    let scene_scroll = if active_pane == 0 { app.xray_scroll.min(scene_max_scroll) } else { 0 };
    
    // Calculate scroll for Global Tags
    let global_max_scroll = global_lines.len().saturating_sub(pane_height);
    let global_scroll = if active_pane == 1 { app.xray_scroll.min(global_max_scroll) } else { 0 };

    let scene_title = if nerd { " 󰉅 BY SCENE " } else { " BY SCENE " };
    let global_title = if nerd { " 󰄱 ALL TAGS " } else { " ALL TAGS " };

    let scene_scroll_hint = if scene_lines.len() > pane_height {
        format!(" [{}/{} lines] ", scene_scroll + 1, scene_lines.len())
    } else {
        String::new()
    };
    
    let global_scroll_hint = if global_lines.len() > pane_height {
        format!(" [{}/{} lines] ", global_scroll + 1, global_lines.len())
    } else {
        String::new()
    };

    let (scene_border, scene_title_style) = if active_pane == 0 {
        (Style::default().fg(accent), Style::default().fg(accent).add_modifier(Modifier::BOLD))
    } else {
        (Style::default().fg(dim), Style::default().fg(dim))
    };

    let (global_border, global_title_style) = if active_pane == 1 {
        (Style::default().fg(accent), Style::default().fg(accent).add_modifier(Modifier::BOLD))
    } else {
        (Style::default().fg(dim), Style::default().fg(dim))
    };

    let scene_block = Block::default()
        .title(Line::from(vec![
            Span::styled(scene_title, scene_title_style),
            Span::styled(scene_scroll_hint, Style::default().fg(dim)),
        ]))
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(scene_border);

    let global_block = Block::default()
        .title(Line::from(vec![
            Span::styled(global_title, global_title_style),
            Span::styled(global_scroll_hint, Style::default().fg(dim)),
        ]))
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(global_border);

    let visible_scene: Vec<Line> = scene_lines.into_iter().skip(scene_scroll).collect();
    let visible_global: Vec<Line> = global_lines.into_iter().skip(global_scroll).collect();

    if visible_scene.is_empty() {
        f.render_widget(
            Paragraph::new("  No scene-level tags found.")
                .block(scene_block)
                .style(theme.secondary_style()),
            content_chunks[0],
        );
    } else {
        f.render_widget(
            Paragraph::new(visible_scene)
                .block(scene_block)
                .wrap(ratatui::widgets::Wrap { trim: true }),
            content_chunks[0],
        );
    }

    f.render_widget(
        Paragraph::new(visible_global)
            .block(global_block)
            .wrap(ratatui::widgets::Wrap { trim: true }),
        content_chunks[1],
    );
}
