use crate::app::{App, XRayData};
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect, Alignment},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, Paragraph, Table, Row, Cell},
};
use tui_piechart::{PieChart, PieSlice};

pub fn draw_pulse(f: &mut Frame, area: Rect, app: &App, data: &XRayData) {
    let theme = &app.theme;
    let accent = Color::from(theme.ui.tree_mode_bg.clone());
    let dim = Color::from(theme.ui.dim.clone());
    let info_color = Color::from(theme.ui.info.clone());
    let dialogue_color = Color::from(theme.ui.search_highlight_bg.clone());
    let nerd = app.config.use_nerd_fonts;

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(35),
            Constraint::Percentage(65),
        ])
        .split(area);

    let left_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(12), // Height for 3 rows of stats
            Constraint::Min(0),     // The rest goes to PieChart
        ])
        .split(chunks[0]);

    // Create a 2x2 grid + 1 full width row for the 5 stats
    let stat_rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(4),
            Constraint::Length(4),
            Constraint::Length(4),
        ])
        .split(left_chunks[0]);

    let row1 = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(stat_rows[0]);
    let row2 = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(stat_rows[1]);
    let row3 = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(100)])
        .split(stat_rows[2]);

    let stat_rects = [row1[0], row1[1], row2[0], row2[1], row3[0]];

    let total_pages: f32 = data.scenes.iter().map(|s| s.page_count).sum();
    let runtime_mins = total_pages.ceil() as usize;
    let dialogue_pct = if data.total_words > 0 {
        (data.total_dialogue_words as f32 / data.total_words as f32) * 100.0
    } else {
        0.0
    };
    let action_pct = 100.0 - dialogue_pct;

    let stats: Vec<(&str, String, &str)> = if nerd {
        vec![
            ("EST. RUNTIME", format!("~{}m", runtime_mins), "󱑊"),
            ("TOTAL WORDS", format!("{}", data.total_words), "󰗊"),
            ("SCENES", format!("{}", data.scenes.len()), "󰉅"),
            ("ACTION", format!("{:.0}%", action_pct), "󱐋"),
            ("DIALOGUE", format!("{:.0}%", dialogue_pct), "󰼭"),
        ]
    } else {
        vec![
            ("EST. RUNTIME", format!("~{}m", runtime_mins), ""),
            ("TOTAL WORDS", format!("{}", data.total_words), ""),
            ("SCENES", format!("{}", data.scenes.len()), ""),
            ("ACTION", format!("{:.0}%", action_pct), ""),
            ("DIALOGUE", format!("{:.0}%", dialogue_pct), ""),
        ]
    };

    for (i, (label, value, icon)) in stats.iter().enumerate() {
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(dim));

        let icon_label = if icon.is_empty() {
            label.to_string()
        } else {
            format!("{} {}", icon, label)
        };

        let content = vec![
            Line::from(Span::styled(
                &icon_label,
                Style::default().fg(dim).add_modifier(Modifier::BOLD),
            )),
            Line::from(Span::styled(
                value.as_str(),
                Style::default().fg(accent).add_modifier(Modifier::BOLD),
            )),
        ];
        f.render_widget(
            Paragraph::new(content).block(block).alignment(Alignment::Center),
            stat_rects[i],
        );
    }

    // Draw Pie Chart in left_chunks[1]
    let slices = vec![
        PieSlice::new("Action", action_pct as f64, info_color),
        PieSlice::new("Dialogue", dialogue_pct as f64, dialogue_color),
    ];

    let pie_title = if nerd { " 󱐋 BALANCE " } else { " BALANCE " };
    let pie = PieChart::new(slices)
        .block(
            Block::default()
                .title(pie_title)
                .title_style(Style::default().fg(accent).add_modifier(Modifier::BOLD))
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(Style::default().fg(dim)),
        )
        // Set radius if possible? The library automatically centers and maximizes within area constraints.
        // We ensure left_chunks[1] is large enough so the circle chart gets huge.
        .show_legend(true)
        .show_percentages(true);

    f.render_widget(pie, left_chunks[1]);

    // Draw Scene List Table on the right side
    let table_height = chunks[1].height.saturating_sub(3) as usize;
    let max_scroll = data.scenes.len().saturating_sub(table_height);
    let scroll = app.xray_scroll.min(max_scroll);

    let bar_cols: usize = 14;

    let visible_scenes: Vec<_> = data.scenes.iter().skip(scroll).take(table_height).collect();

    let rows: Vec<Row> = visible_scenes.iter().map(|scene| {
        let total_lines = (scene.action_lines + scene.dialogue_lines).max(1) as f32;
        let act_pct = (scene.action_lines as f32 / total_lines) * 100.0;
        let dial_pct = (scene.dialogue_lines as f32 / total_lines) * 100.0;

        let act_filled = ((act_pct / 100.0) * bar_cols as f32).round() as usize;
        let act_bar = "█".repeat(act_filled.min(bar_cols)) + &"░".repeat(bar_cols.saturating_sub(act_filled));

        let dial_filled = ((dial_pct / 100.0) * bar_cols as f32).round() as usize;
        let dial_bar = "█".repeat(dial_filled.min(bar_cols)) + &"░".repeat(bar_cols.saturating_sub(dial_filled));

        Row::new(vec![
            Cell::from(scene.scene_num.as_deref().unwrap_or("-").to_string()),
            Cell::from(scene.label.clone()),
            Cell::from(format!("{:>3.0}% {}", act_pct, act_bar)).style(Style::default().fg(info_color)),
            Cell::from(format!("{:>3.0}% {}", dial_pct, dial_bar)).style(Style::default().fg(dialogue_color)),
        ])
        .style(Style::default().fg(theme.primary_fg()))
    }).collect();

    let header = Row::new(vec![
        Cell::from(" # ").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("HEADING").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("ACTION").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("DIALOGUE").style(Style::default().add_modifier(Modifier::BOLD)),
    ])
    .style(Style::default().fg(accent))
    .bottom_margin(1);

    let scroll_hint = if data.scenes.len() > table_height {
        format!(" [{}-{} of {}] (↑↓) ", scroll + 1, (scroll + table_height).min(data.scenes.len()), data.scenes.len())
    } else {
        String::new()
    };

    let table_title = if nerd { " 󰙅 PACING BY SCENE " } else { " PACING BY SCENE " };

    let table = Table::new(rows, [
        Constraint::Length(5),
        Constraint::Percentage(40),
        Constraint::Length(21),
        Constraint::Length(21),
    ])
    .header(header)
    .block(
        Block::default()
            .title(Line::from(vec![
                Span::styled(table_title, Style::default().fg(accent).add_modifier(Modifier::BOLD)),
                Span::styled(scroll_hint, Style::default().fg(dim)),
            ]))
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(dim)),
    )
    .column_spacing(1);

    f.render_widget(table, chunks[1]);
}
