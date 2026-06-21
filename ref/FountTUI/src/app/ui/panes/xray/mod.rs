use crate::app::App;
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect, Alignment},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, Paragraph, List, ListItem},
};

pub mod pulse;
pub mod ensemble;
pub mod blueprint;
pub mod inventory;

pub fn draw_xray_studio(f: &mut Frame, app: &mut App, area: Rect) {
    let theme = &app.theme;
    let accent = Color::from(theme.ui.tree_mode_bg.clone());
    let selection_bg = Color::from(theme.ui.selection_bg.clone());
    let selection_fg = Color::from(theme.ui.selection_fg.clone());
    let dim = Color::from(theme.ui.dim.clone());

    f.render_widget(ratatui::widgets::Clear, area);
    f.render_widget(Block::default().style(Style::default().bg(theme.primary_bg())), area);

    let master_block = Block::default()
        .title(Span::styled(
            if app.config.use_nerd_fonts { " 󰆣 Analysis Studio " } else { " Analysis Studio " },
            Style::default().fg(accent).add_modifier(Modifier::BOLD),
        ))
        .borders(Borders::ALL)
        .border_type(BorderType::Rounded)
        .border_style(Style::default().fg(dim));

    let inner = master_block.inner(area);
    f.render_widget(master_block, area);

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Length(26),
            Constraint::Min(0),
        ])
        .split(inner);

    let (sidebar_area, content_area) = (chunks[0], chunks[1]);

    let tab_labels: Vec<(&str, &str, &str)> = if app.config.use_nerd_fonts {
        vec![
            ("1", " 󱐋 Pulse", "Pacing & Energy"),
            ("2", " 󰼭 Ensemble", "Character Balance"),
            ("3", " 󰙅 Blueprint", "Structural Audit"),
            ("4", " 󰉏 Inventory", "Production Tags"),
        ]
    } else {
        vec![
            ("1", " Pulse", "Pacing & Energy"),
            ("2", " Ensemble", "Character Balance"),
            ("3", " Blueprint", "Structural Audit"),
            ("4", " Inventory", "Production Tags"),
        ]
    };

    let mut sidebar_items = Vec::new();
    sidebar_items.push(ListItem::new(Line::from("")));

    for (i, (key, title, hint)) in tab_labels.iter().enumerate() {
        let selected = app.xray_tab == i;
        let indicator = if selected { "▌" } else { " " };

        let title_style = if selected {
            Style::default().fg(selection_fg).bg(selection_bg).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(theme.primary_fg())
        };

        let hint_style = if selected {
            Style::default().fg(selection_fg).bg(selection_bg)
        } else {
            Style::default().fg(dim).add_modifier(Modifier::ITALIC)
        };

        let key_style = if selected {
            Style::default().fg(accent).bg(selection_bg).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(dim)
        };

        sidebar_items.push(ListItem::new(vec![
            Line::from(vec![
                Span::styled(indicator, Style::default().fg(accent)),
                Span::styled(format!(" {} ", key), key_style),
                Span::styled(format!("{:<18}", title), title_style),
            ]),
            Line::from(vec![
                Span::raw("    "),
                Span::styled(format!("{:<20}", hint), hint_style),
            ]),
            Line::from(""),
        ]));
    }

    let sidebar_block = Block::default()
        .borders(Borders::RIGHT)
        .border_style(Style::default().fg(dim));

    f.render_widget(
        List::new(sidebar_items).block(sidebar_block),
        sidebar_area,
    );

    if let Some(ref data) = app.xray_data {
        let data = data.clone();
        match app.xray_tab {
            0 => pulse::draw_pulse(f, content_area, app, &data),
            1 => ensemble::draw_ensemble(f, content_area, app, &data),
            2 => blueprint::draw_blueprint(f, content_area, app, &data),
            3 => inventory::draw_inventory(f, content_area, app, &data),
            _ => {}
        }
    } else {
        let msg = if app.config.use_nerd_fonts {
            "󰆣  No analysis data available.\n\n  Run /xray from the editor to analyze your script."
        } else {
            "No analysis data available.\n\n  Run /xray from the editor to analyze your script."
        };
        f.render_widget(
            Paragraph::new(msg)
                .alignment(Alignment::Center)
                .style(theme.secondary_style()),
            content_area,
        );
    }

    let hint_area = Rect::new(
        sidebar_area.x,
        sidebar_area.bottom().saturating_sub(4),
        sidebar_area.width.saturating_sub(1),
        4,
    );
    let mut hints = vec![
        Line::from(vec![
            Span::styled(" 1-4 ", Style::default().fg(accent).add_modifier(Modifier::BOLD)),
            Span::styled("Jump to View", Style::default().fg(dim)),
        ]),
        Line::from(vec![
            Span::styled(" Esc ", Style::default().fg(accent).add_modifier(Modifier::BOLD)),
            Span::styled("Back to Editor", Style::default().fg(dim)),
        ]),
    ];
    if app.xray_tab == 3 {
        hints.insert(0, Line::from(vec![
            Span::styled(" Tab ", Style::default().fg(accent).add_modifier(Modifier::BOLD)),
            Span::styled("Switch Box", Style::default().fg(dim)),
        ]));
    }
    f.render_widget(Paragraph::new(hints), hint_area);
}
