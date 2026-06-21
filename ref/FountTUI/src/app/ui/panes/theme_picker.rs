use crate::app::App;
use ratatui::{
    Frame,
    layout::Rect,
    style::{Color, Modifier, Style},
    widgets::{Block, Borders, BorderType, Clear, List, ListItem},
};

pub fn draw_theme_picker(f: &mut Frame, app: &mut App, area: Rect) {
    let theme = &app.theme;
    let accent = Color::from(theme.ui.normal_mode_bg.clone());
    let sel_bg = Color::from(theme.ui.selection_bg.clone());
    let sel_fg = Color::from(theme.ui.selection_fg.clone());

    let themes = app.theme_manager.list_themes();
    
    let popup_w = 40;
    let popup_h = (themes.len() as u16 + 2).min(area.height.saturating_sub(4));
    
    let center_x = area.x + (area.width.saturating_sub(popup_w)) / 2;
    let center_y = area.y + (area.height.saturating_sub(popup_h)) / 2;
    
    let popup_area = Rect::new(center_x, center_y, popup_w, popup_h);

    let block = Block::default()
        .title(" [ Select Theme ] ")
        .borders(Borders::ALL)
        .border_type(BorderType::Thick)
        .border_style(Style::default().fg(accent))
        .style(theme.normal_style());

    f.render_widget(Clear, popup_area);
    f.render_widget(block.clone(), popup_area);

    let inner = block.inner(popup_area);

    let items: Vec<ListItem> = themes.iter().map(|t| {
        let is_current = t == &app.theme.name;
        let mut text = format!("  {}", t);
        if is_current {
            text.push_str(" (Active)");
        }
        ListItem::new(text)
    }).collect();

    let list = List::new(items)
        .highlight_style(Style::default().bg(sel_bg).fg(sel_fg).add_modifier(Modifier::BOLD))
        .highlight_symbol("> ");

    f.render_stateful_widget(list, inner, &mut app.theme_picker_state);
}
