pub mod home;
pub mod xray;
pub mod index_cards;
pub mod quick_help;
pub mod structure_picker;
pub mod theme_picker;
pub mod settings;

use unicode_width::UnicodeWidthStr;
use crate::app::App;
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Clear, Paragraph, Row, Table, List, ListItem},
};

pub fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints(
            [
                Constraint::Percentage((100 - percent_y) / 2),
                Constraint::Percentage(percent_y),
                Constraint::Percentage((100 - percent_y) / 2),
            ]
            .as_ref(),
        )
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints(
            [
                Constraint::Percentage((100 - percent_x) / 2),
                Constraint::Percentage(percent_x),
                Constraint::Percentage((100 - percent_x) / 2),
            ]
            .as_ref(),
        )
        .split(popup_layout[1])[1]
}

pub fn draw_sprint_stats(f: &mut Frame, app: &mut App) {
    let area = f.area();
    let theme = &app.theme;
    let mode_bg = Color::from(theme.ui.normal_mode_bg.clone());

    let modal_area = centered_rect(80, 60, area);
    f.render_widget(Clear, modal_area);

    let history_block = Block::default()
        .title(" [ Sprint History | Press E to Export ] ")
        .borders(Borders::ALL)
        .border_type(ratatui::widgets::BorderType::Rounded)
        .border_style(theme.secondary_style())
        .style(theme.normal_style());

    let inner_area = modal_area.inner(ratatui::layout::Margin {
        horizontal: 1,
        vertical: 1,
    });

    let header = Row::new(vec![
        Cell::from("Project"),
        Cell::from("Date"),
        Cell::from("Time"),
        Cell::from("Words"),
        Cell::from("Lines"),
    ])
    .style(
        Style::default()
            .bg(mode_bg)
            .fg(theme.ui.selection_fg.clone().into())
            .add_modifier(Modifier::BOLD),
    );

    let rows: Vec<Row> = app
        .sprint_history
        .iter()
        .map(|s| {
            Row::new(vec![
                Cell::from(s.project_name.clone()),
                Cell::from(s.timestamp.format("%Y-%m-%d").to_string()),
                Cell::from(format!("{}m", s.duration_mins)),
                Cell::from(s.word_count.to_string()),
                Cell::from(s.line_count.to_string()),
            ])
        })
        .collect();

    let table = Table::new(
        rows,
        [
            Constraint::Percentage(30),
            Constraint::Percentage(20),
            Constraint::Percentage(15),
            Constraint::Percentage(15),
            Constraint::Percentage(20),
        ],
    )
    .header(header)
    .block(history_block)
    .row_highlight_style(Style::default().bg(Color::from(theme.ui.selection_bg.clone())).fg(Color::from(theme.ui.selection_fg.clone())));

    f.render_stateful_widget(table, inner_area, &mut app.sprint_stats_state);
}

pub fn draw_file_picker(f: &mut Frame, app: &mut App, area: Rect) {
    let state = if let Some(ref mut s) = app.file_picker {
        s
    } else {
        return;
    };

    let ext = state.extension_filter.first().cloned().unwrap_or_else(|| "fountain".to_string());

    if state.action != crate::app::FilePickerAction::Open {
        // SAVE & EXPORT MODES
        if !state.naming_mode {
            // ==================== STAGE 1: FOLDER SELECTION STAGE ====================
            let block_w = 75u16.min(area.width);
            let block_h = 24u16.min(area.height);
            let x = area.x + (area.width - block_w) / 2;
            let y = area.y + (area.height - block_h) / 2;
            let block_area = Rect::new(x, y, block_w, block_h);

            f.render_widget(Clear, block_area);

            let title = match state.action {
                crate::app::FilePickerAction::Save => " [ Save - Choose Folder ] ",
                crate::app::FilePickerAction::ExportReport => " [ Export Report - Choose Folder ] ",
                crate::app::FilePickerAction::ExportScript => " [ Export Script - Choose Folder ] ",
                crate::app::FilePickerAction::ExportSprints => " [ Export Sprints - Choose Folder ] ",
                _ => " [ Choose Folder ] ",
            };

            let mode_bg = Color::from(app.theme.ui.normal_mode_bg.clone());
            let block = Block::default()
                .title(Span::styled(
                    title,
                    Style::default()
                        .fg(mode_bg)
                        .add_modifier(Modifier::BOLD),
                ))
                .borders(Borders::ALL)
                .border_type(ratatui::widgets::BorderType::Rounded)
                .border_style(app.theme.secondary_style())
                .style(app.theme.normal_style());
            f.render_widget(block, block_area);

            let inner_area = block_area.inner(ratatui::layout::Margin {
                horizontal: 2,
                vertical: 1,
            });

            let layout = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(2), // Folder display with padding
                    Constraint::Min(0),    // Directory list
                    Constraint::Length(1), // Footer instructions
                ])
                .split(inner_area);

            // 1. Current Folder Display
            let folder_label = if app.config.use_nerd_fonts {
                Line::from(vec![
                    Span::styled("Destination: 󰉋  ", app.theme.warning_style().add_modifier(Modifier::BOLD)),
                    Span::styled(state.current_dir.to_string_lossy().into_owned(), app.theme.secondary_style().add_modifier(Modifier::BOLD)),
                ])
            } else {
                Line::from(vec![
                    Span::styled("Destination: ", app.theme.warning_style().add_modifier(Modifier::BOLD)),
                    Span::styled(state.current_dir.to_string_lossy().into_owned(), app.theme.secondary_style().add_modifier(Modifier::BOLD)),
                ])
            };
            f.render_widget(Paragraph::new(folder_label), layout[0]);

            // 2. Directory List
            let selected_idx = state.list_state.selected().unwrap_or(0);
            let display_items: Vec<ListItem> = state
                .items
                .iter()
                .enumerate()
                .map(|(i, path)| {
                    let is_selected = i == selected_idx;
                    
                    let name = if let Some(parent) = state.current_dir.parent() {
                        if path == parent {
                            if app.config.use_nerd_fonts {
                                "󰁝  .. (Parent Directory)".to_string()
                            } else {
                                ".. (Parent Directory)".to_string()
                            }
                        } else {
                            path.file_name()
                                .map(|n| n.to_string_lossy().into_owned())
                                .unwrap_or_else(|| "/".to_string())
                        }
                    } else {
                        path.file_name()
                            .map(|n| n.to_string_lossy().into_owned())
                            .unwrap_or_else(|| "/".to_string())
                    };

                    let icon = if app.config.use_nerd_fonts {
                        if name.starts_with('󰁝') { "" } else { "󰉋  " }
                    } else {
                        ""
                    };

                    let style = if is_selected {
                        Style::default()
                            .bg(Color::from(app.theme.ui.selection_bg.clone()))
                            .fg(Color::from(app.theme.ui.selection_fg.clone()))
                            .add_modifier(Modifier::BOLD)
                    } else {
                        Style::default().fg(Color::from(app.theme.ui.tree_mode_bg.clone()))
                    };

                    ListItem::new(Line::from(vec![
                        Span::styled(
                            if is_selected {
                                if app.config.use_nerd_fonts { "󰁔 " } else { "> " }
                            } else {
                                "  "
                            },
                            style,
                        ),
                        Span::styled(icon, style),
                        Span::styled(name, style),
                    ]))
                })
                .collect();

            let list = List::new(display_items).highlight_style(Style::default());
            f.render_stateful_widget(list, layout[1], &mut state.list_state);

            // 3. Footer instructions
            let footer = Line::from(vec![
                Span::styled(" [↑/↓] ", app.theme.secondary_style().add_modifier(Modifier::BOLD)),
                Span::raw("Navigate   "),
                Span::styled(" [Enter] ", app.theme.secondary_style().add_modifier(Modifier::BOLD)),
                Span::raw("Open   "),
                Span::styled(" [Backspace] ", app.theme.secondary_style().add_modifier(Modifier::BOLD)),
                Span::raw("Up   "),
                Span::styled(" [Tab] ", app.theme.success_style().add_modifier(Modifier::BOLD)),
                Span::styled("Save", app.theme.success_style().add_modifier(Modifier::BOLD)),
            ]);
            f.render_widget(Paragraph::new(footer), layout[2]);

        } else {
            // ==================== STAGE 2: FILENAME SELECTION STAGE ====================
            let block_w = 65u16.min(area.width);
            let block_h = 10u16.min(area.height);
            let x = area.x + (area.width - block_w) / 2;
            let y = area.y + (area.height - block_h) / 2;
            let block_area = Rect::new(x, y, block_w, block_h);

            f.render_widget(Clear, block_area);

            let title = match state.action {
                crate::app::FilePickerAction::Save => " [ Save - Set Filename ] ",
                crate::app::FilePickerAction::ExportReport => " [ Export Report - Set Filename ] ",
                crate::app::FilePickerAction::ExportScript => " [ Export Script - Set Filename ] ",
                crate::app::FilePickerAction::ExportSprints => " [ Export Sprints - Set Filename ] ",
                _ => " [ Set Filename ] ",
            };

            let mode_bg = Color::from(app.theme.ui.normal_mode_bg.clone());
            let block = Block::default()
                .title(Span::styled(
                    title,
                    Style::default()
                        .fg(mode_bg)
                        .add_modifier(Modifier::BOLD),
                ))
                .borders(Borders::ALL)
                .border_type(ratatui::widgets::BorderType::Rounded)
                .border_style(app.theme.warning_style())
                .style(app.theme.normal_style());
            f.render_widget(block, block_area);

            let inner_area = block_area.inner(ratatui::layout::Margin {
                horizontal: 2,
                vertical: 1,
            });

            let layout = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(1), // Locked Destination Info
                    Constraint::Length(3), // Focused Filename Input Area
                    Constraint::Length(1), // Footer Hints
                ])
                .split(inner_area);

            // 1. Locked Destination Info
            let folder_label = if app.config.use_nerd_fonts {
                Line::from(vec![
                    Span::styled(format!("󰉋  Folder: {} ", state.current_dir.display()), app.theme.secondary_style().add_modifier(Modifier::ITALIC)),
                    Span::styled(" 󰌾", app.theme.error_style().add_modifier(Modifier::BOLD)),
                ])
            } else {
                Line::from(vec![
                    Span::styled(format!("Folder: {} ", state.current_dir.display()), app.theme.secondary_style().add_modifier(Modifier::ITALIC)),
                    Span::styled(" [LOCKED]", app.theme.error_style().add_modifier(Modifier::BOLD)),
                ])
            };
            f.render_widget(Paragraph::new(folder_label), layout[0]);

            // 2. Focused Filename Input Area
            let input_box = Block::default()
                .borders(Borders::ALL)
                .border_type(ratatui::widgets::BorderType::Rounded)
                .border_style(app.theme.success_style())
                .title(" Filename ");

            let text_color = Color::from(app.theme.ui.foreground.clone().unwrap_or_else(|| crate::theme::HexColor("white".to_string())));
            let text_style = Style::default().fg(text_color).add_modifier(Modifier::BOLD);
            let ext_style = Style::default().fg(Color::from(app.theme.ui.dim.clone()));

            let input_text = Line::from(vec![
                Span::styled(format!(" {}", state.filename_input), text_style),
                Span::styled(format!(".{}", ext), ext_style),
            ]);

            f.render_widget(Paragraph::new(input_text).block(input_box), layout[1]);

            // 3. Footer hints
            let footer = Line::from(vec![
                Span::styled(" [Enter] ", app.theme.success_style().add_modifier(Modifier::BOLD)),
                Span::raw("Save   "),
                Span::styled(" [Tab] ", app.theme.secondary_style().add_modifier(Modifier::BOLD)),
                Span::raw("Back   "),
                Span::styled(" [Esc] ", app.theme.error_style().add_modifier(Modifier::BOLD)),
                Span::raw("Cancel"),
            ]);
            f.render_widget(Paragraph::new(footer), layout[2]);

            // Cursor Pos inside the input box
            let cursor_x = if state.name_input_touched {
                layout[1].x + 2 + UnicodeWidthStr::width(state.filename_input.as_str()) as u16
            } else {
                layout[1].x + 2 // Cursor is beautifully positioned at the very front
            };
            f.set_cursor_position((cursor_x, layout[1].y + 1));
        }

    } else {
        // ==================== NORMAL OPEN FILE PICKER (SINGLE-STAGE) ====================
        let block_w = 70u16.min(area.width);
        let block_h = 24u16.min(area.height);
        let x = area.x + (area.width - block_w) / 2;
        let y = area.y + (area.height - block_h) / 2;
        let block_area = Rect::new(x, y, block_w, block_h);

        f.render_widget(Clear, block_area);

        let title = " [ Open File ] ";
        let mode_bg = Color::from(app.theme.ui.normal_mode_bg.clone());
        let block = Block::default()
            .title(Span::styled(
                title,
                Style::default()
                    .fg(mode_bg)
                    .add_modifier(Modifier::BOLD),
            ))
            .borders(Borders::ALL)
            .border_type(ratatui::widgets::BorderType::Rounded)
            .border_style(app.theme.secondary_style())
            .style(app.theme.normal_style());
        f.render_widget(block, block_area);

        let inner_area = block_area.inner(ratatui::layout::Margin {
            horizontal: 2,
            vertical: 1,
        });

        let layout = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1), // Current Dir
                Constraint::Min(0),    // List of items
                Constraint::Length(1), // Footer Hints
            ])
            .split(inner_area);

        // 1. Current Dir
        let dir_str = format!(" Dir: {}", state.current_dir.display());
        f.render_widget(
            Paragraph::new(Line::from(vec![
                Span::styled(dir_str, app.theme.secondary_style().add_modifier(Modifier::ITALIC)),
            ])),
            layout[0],
        );

        // 2. List of items
        let selected_idx = state.list_state.selected().unwrap_or(0);
        let display_items: Vec<ListItem> = state
            .items
            .iter()
            .enumerate()
            .map(|(i, path)| {
                let is_selected = i == selected_idx;
                let is_dir = path.is_dir();

                let name = if let Some(parent) = state.current_dir.parent() {
                    if path == parent {
                        ".. (Parent Directory)".to_string()
                    } else {
                        path.file_name()
                            .map(|n| n.to_string_lossy().into_owned())
                            .unwrap_or_else(|| "/".to_string())
                    }
                } else {
                    path.file_name()
                        .map(|n| n.to_string_lossy().into_owned())
                        .unwrap_or_else(|| "/".to_string())
                };

                let (icon, color) = if is_dir {
                    (
                        if app.config.use_nerd_fonts { "󰉋  " } else { "" },
                        app.theme.ui.tree_mode_bg.clone().into(),
                    )
                } else {
                    (
                        if app.config.use_nerd_fonts { "󰈙  " } else { "" },
                        app.theme.primary_fg(),
                    )
                };

                let style = if is_selected {
                    Style::default().bg(Color::from(app.theme.ui.selection_bg.clone())).fg(Color::from(app.theme.ui.selection_fg.clone()))
                } else {
                    Style::default().fg(color)
                };

                ListItem::new(Line::from(vec![
                    Span::styled(
                        if is_selected {
                            if app.config.use_nerd_fonts { "󰁔 " } else { "> " }
                        } else {
                            "  "
                        },
                        style,
                    ),
                    Span::styled(icon, style),
                    Span::styled(name, style),
                ]))
            })
            .collect();

        let list = List::new(display_items).highlight_style(Style::default());
        f.render_stateful_widget(list, layout[1], &mut state.list_state);

        // 3. Footer hints
        let footer = Line::from(vec![
            Span::styled(" [↑/↓] ", app.theme.secondary_style().add_modifier(Modifier::BOLD)),
            Span::raw("Navigate  "),
            Span::styled(" [Enter] ", app.theme.secondary_style().add_modifier(Modifier::BOLD)),
            Span::raw("Open / Select  "),
            Span::styled(" [Backspace] ", app.theme.secondary_style().add_modifier(Modifier::BOLD)),
            Span::raw("Parent Directory  "),
            Span::styled(" [Esc] ", app.theme.error_style().add_modifier(Modifier::BOLD)),
            Span::raw("Cancel"),
        ]);
        f.render_widget(Paragraph::new(footer), layout[2]);
    }

    // Overwrite Confirmation Overlay
    if state.show_overwrite_confirm {
        let confirm_area = centered_rect(60, 30, area);
        f.render_widget(Clear, confirm_area);
        let confirm_block = Block::default()
            .title(Span::styled(" [ Confirm Overwrite ] ", app.theme.error_style().add_modifier(Modifier::BOLD)))
            .borders(Borders::ALL)
            .border_type(ratatui::widgets::BorderType::Double)
            .border_style(app.theme.error_style())
            .style(app.theme.normal_style());
        
        let file_name = state.target_path.as_ref().and_then(|p| p.file_name()).map(|n| n.to_string_lossy()).unwrap_or_default();
        
        let confirm_text = vec![
            Line::from(""),
            Line::from(vec![
                Span::raw(" File "),
                Span::styled(file_name, app.theme.warning_style().add_modifier(Modifier::BOLD)),
                Span::raw(" already exists!"),
            ]),
            Line::from(""),
            Line::from(" Would you like to overwrite it?"),
            Line::from(""),
            Line::from(vec![
                if state.overwrite_confirmed {
                    Span::styled(
                        format!(
                            "  {} YES  ",
                            if app.config.use_nerd_fonts { "󰁔" } else { ">" }
                        ),
                        Style::default()
                            .bg(Color::from(app.theme.ui.success.clone()))
                            .fg(Color::from(app.theme.ui.selection_fg.clone()))
                            .add_modifier(Modifier::BOLD),
                    )
                } else {
                    Span::styled("    Yes  ", app.theme.success_style())
                },
                Span::raw("      "),
                if !state.overwrite_confirmed {
                    Span::styled(
                        format!(
                            "  {} NO   ",
                            if app.config.use_nerd_fonts { "󰁔" } else { ">" }
                        ),
                        Style::default()
                            .bg(Color::from(app.theme.ui.error.clone()))
                            .fg(Color::from(app.theme.ui.selection_fg.clone()))
                            .add_modifier(Modifier::BOLD),
                    )
                } else {
                    Span::styled("    No   ", app.theme.error_style())
                },
            ]),
            Line::from(""),
            Line::from(vec![
                Span::styled(" [<-/->] ", app.theme.secondary_style()),
                Span::raw("Switch  "),
                Span::styled(" [Enter] ", app.theme.secondary_style()),
                Span::raw("Confirm"),
            ]),
        ];
        
        f.render_widget(Paragraph::new(confirm_text).block(confirm_block).alignment(ratatui::layout::Alignment::Center), confirm_area);
    }
}

pub fn draw_snapshots(f: &mut Frame, app: &mut App) {
    let area = f.area();
    let theme = &app.theme;
    let mode_bg = Color::from(theme.ui.normal_mode_bg.clone());

    let modal_area = centered_rect(70, 60, area);
    f.render_widget(Clear, modal_area);

    let block = Block::default()
        .title(" [ Snapshots | Enter: Replace | O: Open in New ] ")
        .borders(Borders::ALL)
        .border_type(ratatui::widgets::BorderType::Rounded)
        .border_style(theme.secondary_style())
        .style(theme.normal_style());

    let header = Row::new(vec![
        Cell::from("File Name"),
        Cell::from("Date"),
        Cell::from("Time"),
    ])
    .style(
        Style::default()
            .bg(mode_bg)
            .fg(theme.ui.selection_fg.clone().into())
            .add_modifier(Modifier::BOLD),
    );

    let rows: Vec<Row> = app
        .snapshots
        .iter()
        .map(|s| {
            Row::new(vec![
                Cell::from(s.display_stem()),
                Cell::from(s.display_date()),
                Cell::from(s.display_time_only()),
            ])
        })
        .collect();

    let table = Table::new(
        rows,
        [
            Constraint::Percentage(50),
            Constraint::Percentage(25),
            Constraint::Percentage(25),
        ],
    )
    .header(header)
    .block(block)
    .row_highlight_style(
        Style::default()
            .bg(Color::from(theme.ui.selection_bg.clone()))
            .fg(Color::from(theme.ui.selection_fg.clone()))
            .add_modifier(Modifier::BOLD),
    );

    f.render_stateful_widget(table, modal_area, &mut app.snapshot_list_state);
}

pub fn draw_export_modal(f: &mut Frame, app: &App) {
    let area = f.area();
    let theme = &app.theme;
    let mode_bg = Color::from(theme.ui.normal_mode_bg.clone());
    let _dim_color = Color::from(theme.ui.dim.clone());

    let modal_area = centered_rect(60, 60, area);
    f.render_widget(Clear, modal_area);

    let block = Block::default()
        .title(" [ Export ] ")
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
            Constraint::Length(3), // Tabs
            Constraint::Min(0),    // Options
            Constraint::Length(1), // Footer hint
        ])
        .split(inner_area);

    // 1. Tabs
    let tab_titles = [" 1. Screenplay ", " 2. Reports "];
    let tabs_spans: Vec<Span> = tab_titles
        .iter()
        .enumerate()
        .map(|(i, t)| {
            if i == app.export_tab {
                Span::styled(
                    t.to_string(),
                    Style::default()
                        .fg(Color::from(theme.ui.selection_fg.clone()))
                        .bg(Color::from(theme.ui.selection_bg.clone()))
                        .add_modifier(Modifier::BOLD),
                )
            } else {
                Span::styled(t.to_string(), theme.secondary_style())
            }
        })
        .collect();

    let mut tab_line = Vec::new();
    for (i, span) in tabs_spans.into_iter().enumerate() {
        tab_line.push(span);
        if i < 1 {
            tab_line.push(Span::styled("  ", Style::default()));
        }
    }
    f.render_widget(Paragraph::new(Line::from(tab_line)).alignment(ratatui::layout::Alignment::Center).block(Block::default().borders(Borders::BOTTOM).border_style(theme.secondary_style())), layout[0]);

    // 2. Options
    let mut options = Vec::new();

    let render_option = |_idx: usize, label: &str, value: &str, is_selected: bool| -> ListItem {
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
                        "󰁔 "
                    } else {
                        "> "
                    }
                } else {
                    "   "
                },
                style,
            ),
            Span::styled(format!("{:<18}", label), style),
            Span::styled(value.to_string(), val_style),
        ]))
    };

    if app.export_tab == 0 {
        // Screenplay Tab
        let format_label = match app.config.export_format.as_str() {
            "pdf" => "PDF",
            "fountain" => "Fountain",
            _ => "PDF",
        };
        let font_label = match app.config.export_font.as_str() {
            "courier_prime" => "Courier Prime",
            "courier_prime_sans" => "Courier Prime Sans",
            _ => "Courier Prime",
        };

        options.push(render_option(0, "Format", format_label, app.selected_export_option == 0));

        let format = app.config.export_format.as_str();
        if format == "pdf" {
            options.push(render_option(1, "Paper Size", &app.config.paper_size.to_uppercase(), app.selected_export_option == 1));
            options.push(render_option(2, "Font", font_label, app.selected_export_option == 2));
            options.push(render_option(3, "Bold Headings", if app.config.export_bold_scene_headings { if app.config.use_nerd_fonts { "󰄲 " } else { "[X]" } } else { if app.config.use_nerd_fonts { "󰄱 " } else { "[ ]" } }, app.selected_export_option == 3));
            options.push(render_option(4, "Scene Numbers", if app.config.mirror_scene_numbers != crate::config::MirrorOption::Off { if app.config.use_nerd_fonts { "󰄲 " } else { "[X]" } } else { if app.config.use_nerd_fonts { "󰄱 " } else { "[ ]" } }, app.selected_export_option == 4));
            options.push(render_option(5, "Include Sections", if app.config.export_sections { if app.config.use_nerd_fonts { "󰄲 " } else { "[X]" } } else { if app.config.use_nerd_fonts { "󰄱 " } else { "[ ]" } }, app.selected_export_option == 5));
            options.push(render_option(6, "Include Synopses", if app.config.export_synopses { if app.config.use_nerd_fonts { "󰄲 " } else { "[X]" } } else { if app.config.use_nerd_fonts { "󰄱 " } else { "[ ]" } }, app.selected_export_option == 6));
            options.push(render_option(7, "Title Page", if app.config.include_title_page { if app.config.use_nerd_fonts { "󰄲 " } else { "[X]" } } else { if app.config.use_nerd_fonts { "󰄱 " } else { "[ ]" } }, app.selected_export_option == 7));

            options.push(ListItem::new(Line::raw("")));
            let export_style = if app.selected_export_option == 8 {
                Style::default().bg(theme.ui.success.clone().into()).fg(theme.ui.selection_fg.clone().into()).add_modifier(Modifier::BOLD)
            } else {
                theme.success_style()
            };
            options.push(ListItem::new(Line::from(vec![
                Span::styled(
                    if app.selected_export_option == 8 {
                        if app.config.use_nerd_fonts { "󰁔 " } else { "> " }
                    } else {
                        "   "
                    },
                    export_style,
                ),
                Span::styled(" [ EXPORT SCREENPLAY ] ", export_style),
            ])));
        } else if format == "fountain" {
            options.push(render_option(1, "Include Sections", if app.config.export_sections { if app.config.use_nerd_fonts { "󰄲 " } else { "[X]" } } else { if app.config.use_nerd_fonts { "󰄱 " } else { "[ ]" } }, app.selected_export_option == 1));
            options.push(render_option(2, "Include Synopses", if app.config.export_synopses { if app.config.use_nerd_fonts { "󰄲 " } else { "[X]" } } else { if app.config.use_nerd_fonts { "󰄱 " } else { "[ ]" } }, app.selected_export_option == 2));
            options.push(render_option(3, "Include Production Tags", if app.config.export_production_tags { if app.config.use_nerd_fonts { "󰄲 " } else { "[X]" } } else { if app.config.use_nerd_fonts { "󰄱 " } else { "[ ]" } }, app.selected_export_option == 3));
            options.push(render_option(4, "Title Page", if app.config.include_title_page { if app.config.use_nerd_fonts { "󰄲 " } else { "[X]" } } else { if app.config.use_nerd_fonts { "󰄱 " } else { "[ ]" } }, app.selected_export_option == 4));

            options.push(ListItem::new(Line::raw("")));
            let export_style = if app.selected_export_option == 5 {
                Style::default().bg(theme.ui.success.clone().into()).fg(theme.ui.selection_fg.clone().into()).add_modifier(Modifier::BOLD)
            } else {
                theme.success_style()
            };
            options.push(ListItem::new(Line::from(vec![
                Span::styled(
                    if app.selected_export_option == 5 {
                        if app.config.use_nerd_fonts { "󰁔 " } else { "> " }
                    } else {
                        "   "
                    },
                    export_style,
                ),
                Span::styled(" [ EXPORT SCREENPLAY ] ", export_style),
            ])));
        } else {
            options.push(ListItem::new(Line::raw("")));
            let export_style = if app.selected_export_option == 1 {
                Style::default().bg(theme.ui.success.clone().into()).fg(theme.ui.selection_fg.clone().into()).add_modifier(Modifier::BOLD)
            } else {
                theme.success_style()
            };
            options.push(ListItem::new(Line::from(vec![
                Span::styled(
                    if app.selected_export_option == 1 {
                        if app.config.use_nerd_fonts { "󰁔 " } else { "> " }
                    } else {
                        "   "
                    },
                    export_style,
                ),
                Span::styled(" [ EXPORT SCREENPLAY ] ", export_style),
            ])));
        }
    } else {
        // Reports Tab
        let report_label = match app.config.report_format.as_str() {
            "csv_scene" => "Scene List (CSV)",
            "csv_char" => "Character Report (CSV)",
            "csv_location" => "Location Report (CSV)",
            "csv_notes" => "Notes & Markers (CSV)",
            "csv_breakdown" => "Script Breakdown (CSV)",
            "txt_dialogue" => "Dialogue Only (TXT)",
            _ => "Scene List (CSV)",
        };

        options.push(render_option(0, "Report Type", report_label, app.selected_export_option == 0));
        
        options.push(ListItem::new(Line::raw("")));
        let export_style = if app.selected_export_option == 1 {
            Style::default().bg(theme.ui.success.clone().into()).fg(theme.ui.selection_fg.clone().into()).add_modifier(Modifier::BOLD)
        } else {
            theme.success_style()
        };
        options.push(ListItem::new(Line::from(vec![
            Span::styled(
                if app.selected_export_option == 1 {
                    if app.config.use_nerd_fonts {
                        "󰁔 "
                    } else {
                        "> "
                    }
                } else {
                    "   "
                },
                export_style,
            ),
            Span::styled(" [ GENERATE REPORT ] ", export_style),
        ])));

        // Add dynamic description for reports
        options.push(ListItem::new(Line::raw("")));
        options.push(ListItem::new(Line::from(vec![
            Span::styled(" Description: ", theme.secondary_style().add_modifier(Modifier::BOLD)),
        ])));
        
        let desc = match app.config.report_format.as_str() {
            "csv_scene" => " A structured list of all scenes with headings, page numbers, and durations.",
            "csv_char" => " Character stats: total lines, scene count, and dialogue percentages.",
            "csv_location" => " A breakdown of all locations and the specific scenes set within them.",
            "csv_notes" => " A list of all internal notes [[...]] and tagged markers in the script.",
            "csv_breakdown" => " A production report covering cast, locations, and structural elements.",
            "txt_dialogue" => " A plain text file containing only character names and dialogue lines.",
            _ => "",
        };
        
        options.push(ListItem::new(Line::from(vec![
            Span::styled(desc, theme.secondary_style().add_modifier(Modifier::ITALIC)),
        ])));
    }

    let options_list = List::new(options)
        .block(Block::default().padding(ratatui::widgets::Padding::new(0, 0, 1, 1)));
    f.render_widget(options_list, layout[1]);

    // 3. Footer
    let footer_text = Line::from(vec![
        Span::styled(" [<-/->] ", Style::default().fg(mode_bg).add_modifier(Modifier::BOLD)),
        Span::styled("Switch Tabs  ", theme.secondary_style()),
        Span::styled(" [^/v] ", Style::default().fg(mode_bg).add_modifier(Modifier::BOLD)),
        Span::styled("Select  ", theme.secondary_style()),
        Span::styled(" [Tab/Enter] ", Style::default().fg(mode_bg).add_modifier(Modifier::BOLD)),
        Span::styled("Toggle/Export", theme.secondary_style()),
    ]);
    f.render_widget(Paragraph::new(footer_text).alignment(ratatui::layout::Alignment::Center), layout[2]);
}
