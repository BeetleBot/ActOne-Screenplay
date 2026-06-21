use crate::app::App;
use ratatui::{
    Frame,
    layout::{Alignment, Layout, Constraint, Direction},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::Paragraph,
};

fn hex_to_rgb(hex: &str) -> (u8, u8, u8) {
    let hex = hex.trim_start_matches('#');
    if hex.len() < 6 { return (128, 128, 128); }
    (
        u8::from_str_radix(&hex[0..2], 16).unwrap_or(128),
        u8::from_str_radix(&hex[2..4], 16).unwrap_or(128),
        u8::from_str_radix(&hex[4..6], 16).unwrap_or(128),
    )
}

fn gradient_color(stops: &[(u8, u8, u8)], t: f32) -> Color {
    if stops.len() < 2 { return Color::White; }
    let t = t.clamp(0.0, 1.0);
    let seg = stops.len() - 1;
    let scaled = t * seg as f32;
    let idx = (scaled as usize).min(seg - 1);
    let lt = scaled - idx as f32;
    let (a, b) = (stops[idx], stops[idx + 1]);
    Color::Rgb(
        (a.0 as f32 + (b.0 as f32 - a.0 as f32) * lt) as u8,
        (a.1 as f32 + (b.1 as f32 - a.1 as f32) * lt) as u8,
        (a.2 as f32 + (b.2 as f32 - a.2 as f32) * lt) as u8,
    )
}

pub fn draw_home(f: &mut Frame, app: &mut App) {
    let area = f.area();
    let theme = &app.theme;

    let accent = Color::from(theme.ui.normal_mode_bg.clone());
    let normal_fg = theme.primary_fg();
    let dim = Color::from(theme.ui.dim.clone());

    // Vertical centering
    let vertical_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Min(0),
            Constraint::Length(35), // Height of our dashboard
            Constraint::Min(0),
        ])
        .split(area);

    // Horizontal centering
    let horizontal_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Min(0),
            Constraint::Length(70), // Width of our dashboard
            Constraint::Min(0),
        ])
        .split(vertical_chunks[1]);

    let dashboard_area = horizontal_chunks[1];

    // ── OUTLINE ──
    let dashboard_block = ratatui::widgets::Block::default()
        .borders(ratatui::widgets::Borders::ALL)
        .border_type(ratatui::widgets::BorderType::Rounded)
        .border_style(Style::default().fg(dim));
    
    let inner_dashboard_area = dashboard_block.inner(dashboard_area);
    f.render_widget(dashboard_block, dashboard_area);

    // ── LOGO & VERSION ──
    let logo = [
        "      ░██     ░████                                     ░██    ",
        "     ░██     ░██                                        ░██    ",
        "    ░██   ░████████  ░███████  ░██    ░██ ░████████  ░████████ ",
        "   ░██       ░██    ░██    ░██ ░██    ░██ ░██    ░██    ░██    ",
        "  ░██        ░██    ░██    ░██ ░██    ░██ ░██    ░██    ░██    ",
        " ░██         ░██    ░██    ░██ ░██   ░███ ░██    ░██    ░██    ",
        "░██          ░██     ░███████   ░█████░██ ░██    ░██     ░████ ",
    ];

    let stops = vec![
        hex_to_rgb(&theme.ui.normal_mode_bg.0),
        hex_to_rgb(&theme.ui.tree_mode_bg.0),
    ];

    let mut content = Vec::new();
    content.push(Line::from("")); // Top padding
    
    // Logo
    let max_logo_w = logo.iter().map(|r| r.chars().count()).max().unwrap_or(1);
    for row in &logo {
        let mut spans = Vec::new();
        for (ci, ch) in row.chars().enumerate() {
            let t = ci as f32 / max_logo_w.max(1) as f32;
            if ch == ' ' {
                spans.push(Span::raw(" "));
            } else {
                spans.push(Span::styled(ch.to_string(), Style::default().fg(gradient_color(&stops, t))));
            }
        }
        content.push(Line::from(spans).alignment(Alignment::Center));
    }

    // Version
    content.push(Line::from(vec![
        Span::styled(format!("v{}", env!("CARGO_PKG_VERSION")), Style::default().fg(dim)),
    ]).alignment(Alignment::Center));

    content.push(Line::from(""));
    content.push(Line::from(Span::styled("─".repeat(inner_dashboard_area.width.saturating_sub(4) as usize), Style::default().fg(dim))).alignment(Alignment::Center));
    content.push(Line::from(""));

    // ── SHORTCUTS ──
    let menu_items = [
        ("n", "New File"),
        ("s", "New with Structure"),
        ("o", "Open File"),
        ("t", "Tutorial"),
        ("q", "Exit"),
    ];

    for (i, (key, label)) in menu_items.iter().enumerate() {
        let is_sel = i == app.home_selected;
        let style = if is_sel { Style::default().add_modifier(Modifier::BOLD) } else { Style::default() };
        
        content.push(Line::from(vec![
            Span::styled("type  ", Style::default().fg(dim)),
            Span::styled(key.to_string(), Style::default().fg(accent).add_modifier(Modifier::BOLD)),
            Span::styled("  for  ", Style::default().fg(dim)),
            Span::styled(label.to_string(), style.fg(normal_fg)),
        ]).alignment(Alignment::Center));
        content.push(Line::from(""));
    }

    content.push(Line::from(Span::styled("─".repeat(inner_dashboard_area.width.saturating_sub(4) as usize), Style::default().fg(dim))).alignment(Alignment::Center));
    content.push(Line::from(""));

    // ── RECENT FILES ──
    if !app.recent_files.is_empty() {
        for (i, path) in app.recent_files.iter().take(4).enumerate() {
            let idx = 5 + i;
            let is_sel = idx == app.home_selected;
            let style = if is_sel { Style::default().add_modifier(Modifier::BOLD) } else { Style::default() };
            let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| "Unknown".to_string());
            
            content.push(Line::from(vec![
                Span::styled(format!("{}  ", i + 1), Style::default().fg(accent)),
                Span::styled(name, style.fg(normal_fg)),
            ]).alignment(Alignment::Center));
            content.push(Line::from(""));
        }
        content.push(Line::from(Span::styled("─".repeat(inner_dashboard_area.width.saturating_sub(4) as usize), Style::default().fg(dim))).alignment(Alignment::Center));
        content.push(Line::from(""));
    }

    // ── FOOTER ──
    let recent_count = app.recent_files.len().min(4);
    let wiki_sel = app.home_selected == 5 + recent_count;
    let github_sel = app.home_selected == 5 + recent_count + 1;

    content.push(Line::from(vec![
        Span::styled("type  ", Style::default().fg(dim)),
        Span::styled("w", Style::default().fg(accent).add_modifier(Modifier::BOLD)),
        Span::styled("  for  ", Style::default().fg(dim)),
        Span::styled("Wiki", if wiki_sel { Style::default().fg(normal_fg).add_modifier(Modifier::BOLD) } else { Style::default().fg(normal_fg) }),
        Span::styled("  |  ", Style::default().fg(dim)),
        Span::styled("type  ", Style::default().fg(dim)),
        Span::styled("g", Style::default().fg(accent).add_modifier(Modifier::BOLD)),
        Span::styled("  for  ", Style::default().fg(dim)),
        Span::styled("GitHub", if github_sel { Style::default().fg(normal_fg).add_modifier(Modifier::BOLD) } else { Style::default().fg(normal_fg) }),
    ]).alignment(Alignment::Center));

    f.render_widget(Paragraph::new(content), inner_dashboard_area);
}

