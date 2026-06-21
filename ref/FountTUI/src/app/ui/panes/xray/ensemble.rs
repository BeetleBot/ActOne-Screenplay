use crate::app::{App, XRayData};
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, BarChart, Row, Table, Cell, Paragraph},
};
use tui_piechart::{PieChart, PieSlice};

pub fn draw_ensemble(f: &mut Frame, area: Rect, app: &App, data: &XRayData) {
    let theme = &app.theme;
    let accent = Color::from(theme.ui.tree_mode_bg.clone());
    let dim = Color::from(theme.ui.dim.clone());
    let selection_bg = Color::from(theme.ui.selection_bg.clone());
    let selection_fg = Color::from(theme.ui.selection_fg.clone());
    let nerd = app.config.use_nerd_fonts;

    if data.characters.is_empty() {
        f.render_widget(
            Paragraph::new("No character dialogue found in the script.")
                .alignment(ratatui::layout::Alignment::Center)
                .style(theme.secondary_style()),
            area,
        );
        return;
    }

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage(50),
            Constraint::Percentage(50),
        ])
        .split(area);

    let bar_count = data.characters.len().min(10);
    let available_width = chunks[0].width as usize;

    let others_words: u64 = if data.characters.len() > 10 {
        data.characters.iter().skip(10).map(|ch| ch.word_count as u64).sum()
    } else {
        0
    };

    let mut bar_data: Vec<(&str, u64)> = data.characters.iter()
        .take(bar_count)
        .map(|ch| (ch.name.as_str(), ch.word_count as u64))
        .collect();

    if others_words > 0 {
        bar_data.push(("Others", others_words));
    }

    let display_count = bar_data.len();
    let bar_width = available_width.saturating_sub(4)
        .checked_div(display_count)
        .map(|p| p.saturating_sub(2).clamp(3, 14) as u16)
        .unwrap_or(8);

    let bar_title = if nerd {
        " 󰗊 DIALOGUE WORDS "
    } else {
        " DIALOGUE WORDS "
    };

    let barchart = BarChart::default()
        .block(
            Block::default()
                .title(bar_title)
                .title_style(Style::default().fg(accent).add_modifier(Modifier::BOLD))
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(Style::default().fg(dim)),
        )
        .data(&bar_data)
        .bar_width(bar_width)
        .bar_gap(1)
        .value_style(Style::default().fg(selection_fg).bg(selection_bg))
        .label_style(Style::default().fg(accent))
        .style(Style::default().fg(accent));

    f.render_widget(barchart, chunks[0]);

    let bottom_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage(35),
            Constraint::Percentage(65),
        ])
        .split(chunks[1]);

    let mut slices = Vec::new();
    let colors = [
        accent,
        Color::from(theme.ui.info.clone()),
        Color::from(theme.ui.search_highlight_bg.clone()),
        Color::from(theme.ui.warning.clone()),
        Color::from(theme.ui.success.clone()),
    ];

    for (i, ch) in data.characters.iter().take(5).enumerate() {
        slices.push(PieSlice::new(&ch.name, ch.percentage as f64, colors[i % colors.len()]));
    }

    if data.characters.len() > 5 {
        let others_pct: f32 = data.characters.iter().skip(5).map(|c| c.percentage).sum();
        if others_pct > 0.0 {
            slices.push(PieSlice::new("Others", others_pct as f64, dim));
        }
    }

    let pie_title = if nerd { " 󰼭 BALANCE " } else { " BALANCE " };

    let pie = PieChart::new(slices)
        .block(
            Block::default()
                .title(pie_title)
                .title_style(Style::default().fg(accent).add_modifier(Modifier::BOLD))
                .borders(Borders::ALL)
                .border_type(BorderType::Rounded)
                .border_style(Style::default().fg(dim)),
        )
        .show_legend(true)
        .show_percentages(true);

    f.render_widget(pie, bottom_chunks[0]);

    let mut interactions: Vec<(String, String, usize)> = data.interaction_matrix.iter()
        .map(|((a, b), c)| (a.clone(), b.clone(), *c))
        .collect();
    interactions.sort_by_key(|i| std::cmp::Reverse(i.2));

    if interactions.is_empty() {
        let msg = Line::from(Span::styled(
            "  No multi-character scenes detected.",
            theme.secondary_style(),
        ));
        let block = Block::default()
            .title(if nerd { " 󰼭 INTERACTIONS " } else { " INTERACTIONS " })
            .title_style(Style::default().fg(accent).add_modifier(Modifier::BOLD))
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(dim));
        f.render_widget(Paragraph::new(vec![Line::from(""), msg]).block(block), bottom_chunks[1]);
        return;
    }

    let max_count = interactions.first().map(|i| i.2).unwrap_or(1).max(1);
    let bar_area_cols = 12;
    let table_height = bottom_chunks[1].height.saturating_sub(3) as usize;
    let max_scroll = interactions.len().saturating_sub(table_height);
    let scroll = app.xray_scroll.min(max_scroll);

    let icon = if nerd { "↔" } else { "<>" };
    let rows: Vec<Row> = interactions.iter().skip(scroll).take(table_height).map(|(a, b, count)| {
        let filled = (*count * bar_area_cols) / max_count;
        let bar: String = "█".repeat(filled) + &"░".repeat(bar_area_cols - filled);

        Row::new(vec![
            Cell::from(format!(" {} {} {}", a, icon, b))
                .style(Style::default().fg(theme.primary_fg()).add_modifier(Modifier::BOLD)),
            Cell::from(count.to_string())
                .style(Style::default().fg(accent).add_modifier(Modifier::BOLD)),
            Cell::from(bar)
                .style(Style::default().fg(accent)),
        ])
        .style(Style::default().fg(theme.primary_fg()))
    }).collect();

    let table_title = if nerd { " 󰼭 INTERACTIONS " } else { " INTERACTIONS " };
    let scroll_hint = if interactions.len() > table_height {
        format!(" [{}-{} of {}] (↑↓) ", scroll + 1, (scroll + table_height).min(interactions.len()), interactions.len())
    } else {
        String::new()
    };

    let table = Table::new(rows, [
        Constraint::Percentage(50),
        Constraint::Length(8),
        Constraint::Min(14),
    ])
    .header(
        Row::new(vec!["PAIR", "SCENES", "FREQUENCY"])
            .style(Style::default().fg(dim).add_modifier(Modifier::BOLD))
            .bottom_margin(1),
    )
    .block(
        Block::default()
            .title(Line::from(vec![
                Span::styled(table_title, Style::default().fg(accent).add_modifier(Modifier::BOLD)),
                Span::styled(scroll_hint, Style::default().fg(dim)),
            ]))
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(dim)),
    );

    f.render_widget(table, bottom_chunks[1]);
}
