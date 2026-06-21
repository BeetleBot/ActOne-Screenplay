use super::centered_rect;
use crate::app::App;
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Clear, List, ListItem, Paragraph},
};

pub fn draw_settings_modal(f: &mut Frame, app: &mut App, area: Rect) {
    let theme = &app.theme;
    let mode_bg = Color::from(theme.ui.normal_mode_bg.clone());

    let modal_area = centered_rect(40, 70, area);
    f.render_widget(Clear, modal_area);

    let block = Block::default()
        .title(" [ Settings ] ")
        .borders(Borders::ALL)
        .border_type(ratatui::widgets::BorderType::Rounded)
        .border_style(theme.secondary_style())
        .style(theme.normal_style());
    f.render_widget(block, modal_area);

    let inner_area = modal_area.inner(ratatui::layout::Margin {
        horizontal: 2,
        vertical: 1,
    });

    let layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Min(0),    // Options
            Constraint::Length(1), // Footer hint
        ])
        .split(inner_area);

    let mut options = Vec::new();

    let render_option = |label: &str, value: &str, is_selected: bool| -> ListItem {
        let style = if is_selected {
            Style::default()
                .fg(Color::from(theme.ui.selection_fg.clone()))
                .bg(Color::from(theme.ui.selection_bg.clone()))
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default()
        };

        let val_style = if is_selected {
            style
        } else {
            Style::default().fg(mode_bg).add_modifier(Modifier::BOLD)
        };

        ListItem::new(Line::from(vec![
            Span::styled(
                if is_selected {
                    if app.config.use_nerd_fonts {
                        " 󰁔 "
                    } else {
                        " > "
                    }
                } else {
                    "   "
                },
                style,
            ),
            Span::styled(format!("{:<20}", label), style),
            Span::styled(value.to_string(), val_style),
        ]))
    };

    let render_header = |title: &str| -> ListItem {
        ListItem::new(Line::from(vec![
            Span::styled(format!("── {} ──", title), Style::default().fg(mode_bg).add_modifier(Modifier::DIM)),
        ]))
    };

    let get_icon = |nerd: &str, plain: &str| -> String {
        if app.config.use_nerd_fonts {
            format!("{} ", nerd)
        } else {
            plain.to_string()
        }
    };

    let get_val = |condition: bool| -> String {
        if app.config.use_nerd_fonts {
            if condition { "󰄲 ".to_string() } else { "󰄱 ".to_string() }
        } else {
            if condition { "[ON]".to_string() } else { "[OFF]".to_string() }
        }
    };

    // Category: View
    options.push(render_header("VIEW"));
    options.push(render_option(
        &format!("{}Focus Mode", get_icon("󰈈", "")),
        &get_val(app.config.focus_mode),
        app.selected_setting == 1,
    ));
    options.push(render_option(
        &format!("{}Typewriter", get_icon("󰌌", "")),
        &get_val(app.config.typewriter_mode),
        app.selected_setting == 2,
    ));
    options.push(render_option(
        &format!("{}Line Numbers", get_icon("󰰍", "")),
        &get_val(app.config.show_line_numbers),
        app.selected_setting == 3,
    ));
    options.push(render_option(
        &format!("{}Nerd Icons", get_icon("󰏇", "")),
        &get_val(app.config.use_nerd_fonts),
        app.selected_setting == 4,
    ));

    // Category: Fountain
    options.push(render_header("FOUNTAIN"));
    options.push(render_option(
        &format!("{}Show Markup", get_icon("󰈝", "")),
        &get_val(!app.config.hide_markup),
        app.selected_setting == 6,
    ));
    options.push(render_option(
        &format!("{}Prod. Tags", get_icon("󰓹", "")),
        &get_val(app.config.show_production_tags),
        app.selected_setting == 7,
    ));
    options.push(render_option(
        &format!("{}Highlight Active", get_icon("󰉈", "")),
        &get_val(app.config.highlight_active_action),
        app.selected_setting == 8,
    ));

    // Category: Structure
    options.push(render_header("STRUCTURE"));
    options.push(render_option(
        &format!("{}Scene Numbers", get_icon("󰎩", "")),
        &get_val(app.config.show_scene_numbers),
        app.selected_setting == 10,
    ));
    options.push(render_option(
        &format!("{}Page Numbers", get_icon("󰈙", "")),
        &get_val(app.config.show_page_numbers),
        app.selected_setting == 11,
    ));
    options.push(render_option(
        &format!("{}Paper Size", get_icon("󰗚", "")),
        &app.config.paper_size.to_uppercase(),
        app.selected_setting == 12,
    ));

    // Category: Writing
    options.push(render_header("WRITING"));
    options.push(render_option(
        &format!("{}Autocomplete", get_icon("󰧑", "")),
        &get_val(app.config.autocomplete),
        app.selected_setting == 14,
    ));
    options.push(render_option(
        &format!("{}Auto (CONT'D)", get_icon("󰑔", "")),
        &get_val(app.config.auto_contd),
        app.selected_setting == 15,
    ));
    options.push(render_option(
        &format!("{}Smart Breaks", get_icon("󰉓", "")),
        &get_val(app.config.auto_paragraph_breaks),
        app.selected_setting == 16,
    ));

    // Category: System
    options.push(render_header("SYSTEM"));
    let auto_save_val = if !app.config.auto_save {
        if app.config.use_nerd_fonts { "󰄱 ".to_string() } else { "[OFF]".to_string() }
    } else {
        match app.config.auto_save_interval {
            30 => if app.config.use_nerd_fonts { "󰄲 30s".to_string() } else { "[30s]".to_string() },
            60 => if app.config.use_nerd_fonts { "󰄲 1m".to_string() } else { "[1 min]".to_string() },
            180 => if app.config.use_nerd_fonts { "󰄲 3m".to_string() } else { "[3 min]".to_string() },
            300 => if app.config.use_nerd_fonts { "󰄲 5m".to_string() } else { "[5 min]".to_string() },
            600 => if app.config.use_nerd_fonts { "󰄲 10m".to_string() } else { "[10 min]".to_string() },
            v => format!("[{}s]", v),
        }
    };
    options.push(render_option(
        &format!("{}Auto-Save", get_icon("󰆓", "")),
        &auto_save_val,
        app.selected_setting == 18,
    ));
    options.push(render_option(
        &format!("{}Active Theme", get_icon("󰏘", "")),
        &app.config.theme,
        app.selected_setting == 19,
    ));


    f.render_widget(List::new(options), layout[0]);

    // Footer
    let footer_text = Line::from(vec![
        Span::styled(
            " [^/v] ",
            Style::default().fg(mode_bg).add_modifier(Modifier::BOLD),
        ),
        Span::styled("Select  ", theme.secondary_style()),
        Span::styled(
            " [Enter/Space] ",
            Style::default().fg(mode_bg).add_modifier(Modifier::BOLD),
        ),
        Span::styled("Toggle Option", theme.secondary_style()),
    ]);
    f.render_widget(
        Paragraph::new(footer_text).alignment(ratatui::layout::Alignment::Center),
        layout[1],
    );
}
