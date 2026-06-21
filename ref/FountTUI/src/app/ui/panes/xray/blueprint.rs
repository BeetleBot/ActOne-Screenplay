use crate::app::{App, XRayData};
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, BorderType, Paragraph, Row, Table, Cell},
};

pub fn draw_blueprint(f: &mut Frame, area: Rect, app: &App, data: &XRayData) {
    let theme = &app.theme;
    let accent = Color::from(theme.ui.tree_mode_bg.clone());
    let dim = Color::from(theme.ui.dim.clone());
    let nerd = app.config.use_nerd_fonts;

    if data.scenes.is_empty() {
        f.render_widget(
            Paragraph::new("No scenes found. Add scene headings to your script.")
                .alignment(ratatui::layout::Alignment::Center)
                .style(theme.secondary_style()),
            area,
        );
        return;
    }

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(5),
            Constraint::Min(0),
        ])
        .split(area);

    let over_count = data.scenes.iter().filter(|s| s.is_over_limit).count();
    let total_pages: f32 = data.scenes.iter().map(|s| s.page_count).sum();
    let longest = data.scenes.iter().map(|s| s.page_count).fold(0.0_f32, f32::max);

    let status_line = if over_count > 0 {
        let icon = if nerd { "" } else { "(!)" };
        Span::styled(
            format!("  {} {} of {} scenes exceed the 3-page limit", icon, over_count, data.scenes.len()),
            theme.warning_style().add_modifier(Modifier::BOLD),
        )
    } else {
        let icon = if nerd { "" } else { "(OK)" };
        Span::styled(
            format!("  {} All {} scenes within optimal bounds", icon, data.scenes.len()),
            theme.success_style(),
        )
    };

    let table_height = chunks[1].height.saturating_sub(3) as usize;
    let max_scroll = data.scenes.len().saturating_sub(table_height);
    let scroll = app.xray_scroll.min(max_scroll);

    let scroll_info = if data.scenes.len() > table_height {
        format!(" [{}-{} of {}] ", scroll + 1, (scroll + table_height).min(data.scenes.len()), data.scenes.len())
    } else {
        String::new()
    };

    let summary = vec![
        Line::from(""),
        Line::from(vec![
            Span::styled(
                if nerd { "  󰙅 STRUCTURAL AUDIT " } else { "  STRUCTURAL AUDIT " },
                Style::default().fg(accent).add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!(" {:.0} pages total, longest: {:.1}pg ", total_pages, longest),
                theme.secondary_style(),
            ),
            Span::styled(scroll_info, Style::default().fg(dim)),
        ]),
        Line::from(vec![status_line]),
    ];
    f.render_widget(Paragraph::new(summary), chunks[0]);

    let max_pages = longest.max(1.0);
    let bar_cols: usize = 20;

    let visible_scenes: Vec<_> = data.scenes.iter().skip(scroll).take(table_height).collect();

    let rows: Vec<Row> = visible_scenes.iter().map(|scene| {
        let filled = ((scene.page_count / max_pages) * bar_cols as f32).round() as usize;
        let bar: String = "█".repeat(filled.min(bar_cols)) + &"░".repeat(bar_cols.saturating_sub(filled));

        let bar_color = if scene.is_over_limit {
            Color::from(theme.ui.warning.clone())
        } else {
            accent
        };

        let (status, status_style) = if scene.is_over_limit {
            (if nerd { " TRIM" } else { "(!) LONG" }, theme.warning_style())
        } else {
            (if nerd { " OK" } else { "OK" }, theme.success_style())
        };

        Row::new(vec![
            Cell::from(scene.scene_num.as_deref().unwrap_or("-").to_string()),
            Cell::from(scene.label.clone()),
            Cell::from(format!("{:.1}", scene.page_count)),
            Cell::from(bar).style(Style::default().fg(bar_color)),
            Cell::from(status).style(status_style),
        ])
        .style(Style::default().fg(theme.primary_fg()))
    }).collect();

    let header = Row::new(vec![
        Cell::from(" # ").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("HEADING").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("PAGES").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("LENGTH").style(Style::default().add_modifier(Modifier::BOLD)),
        Cell::from("STATUS").style(Style::default().add_modifier(Modifier::BOLD)),
    ])
    .style(Style::default().fg(accent))
    .bottom_margin(1);

    let scroll_hint = if data.scenes.len() > table_height {
        " (↑↓ Scroll) "
    } else {
        ""
    };

    let table_title = if nerd { " 󰙅 SCENE BREAKDOWN " } else { " SCENE BREAKDOWN " };

    let table = Table::new(rows, [
        Constraint::Length(5),
        Constraint::Percentage(45),
        Constraint::Length(7),
        Constraint::Length((bar_cols + 2) as u16),
        Constraint::Min(10),
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
