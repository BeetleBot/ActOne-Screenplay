use crate::app::{App, AppMode};
use ratatui::{
    Frame,
    layout::Rect,
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, BorderType, Borders, Clear, List, ListItem},
};

pub fn draw_quick_help(f: &mut Frame, app: &App, area: Rect) {
    let theme = &app.theme;
    
    let mut shortcuts = Vec::new();
    
    match app.mode {
        AppMode::IndexCards => {
            shortcuts.push(("Arrows", "Navigate"));
            shortcuts.push(("Shift + Arrows", "Move Card"));
            shortcuts.push(("Enter", "Edit Card"));
            shortcuts.push(("n", "Add Scene"));
            shortcuts.push(("Shift+N", "Add Section"));
            shortcuts.push(("Del/Backspace", "Delete Card"));
            shortcuts.push(("?", "Toggle Quick Help"));
        }
        _ => {
            shortcuts.push(("?", "Toggle Quick Help"));
        }
    }

    let popup_w = 40;
    let popup_h = (shortcuts.len() as u16) + 2;
    
    let center_x = area.x + (area.width.saturating_sub(popup_w)) / 2;
    let center_y = area.y + (area.height.saturating_sub(popup_h)) / 2;
    
    let popup_area = Rect::new(center_x, center_y, popup_w, popup_h);
    
    let block = Block::default()
        .title(" Quick Help ")
        .borders(Borders::ALL)
        .border_type(BorderType::Thick)
        .border_style(Style::default().fg(Color::from(theme.ui.normal_mode_bg.clone())))
        .style(theme.normal_style());
        
    f.render_widget(Clear, popup_area);
    f.render_widget(block.clone(), popup_area);
    
    let inner = block.inner(popup_area);
    
    let mut list_items = Vec::new();
    for (key, desc) in shortcuts {
        let spans = vec![
            Span::styled(format!("{:>16} ", key), Style::default().add_modifier(Modifier::BOLD)),
            Span::styled(format!(" {}", desc), Style::default().fg(Color::from(theme.ui.dim.clone()))),
        ];
        list_items.push(ListItem::new(Line::from(spans)));
    }
    
    f.render_widget(List::new(list_items), inner);
}
