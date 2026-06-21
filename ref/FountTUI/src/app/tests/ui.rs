use super::*;

    #[test]
    fn test_draw_focus_mode_hides_panels() {
        use ratatui::{Terminal, backend::TestBackend};
        let mut app = create_empty_app();
        app.config.focus_mode = true;

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal.draw(|f| crate::app::ui::draw(f, &mut app)).unwrap();

        let mut content = String::new();
        let buffer = terminal.backend().buffer();
        for y in 0..24u16 {
            for x in 0..80u16 {
                content.push_str(buffer[(x, y)].symbol());
            }
        }

        assert!(
            !content.contains("fount"),
            "Top panel should be hidden in focus mode"
        );
        assert!(
            !content.contains("^X"),
            "Bottom panel should be hidden in focus mode"
        );
    }

    #[test]
    fn test_draw_focus_mode_shows_prompt() {
        use ratatui::{Terminal, backend::TestBackend};
        let mut app = create_empty_app();
        app.config.focus_mode = true;
        app.mode = AppMode::PromptSave;

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal.draw(|f| crate::app::ui::draw(f, &mut app)).unwrap();

        let mut content = String::new();
        let buffer = terminal.backend().buffer();
        for y in 0..24u16 {
            for x in 0..80u16 {
                content.push_str(buffer[(x, y)].symbol());
            }
        }

        assert!(
            content.contains("Save") && content.contains("modified"),
            "Prompt should appear even in focus mode. Content: {}", content
        );
    }

    #[test]
    fn test_draw_focus_mode_shows_status_msg() {
        use ratatui::{Terminal, backend::TestBackend};
        let mut app = create_empty_app();
        app.config.focus_mode = true;
        app.set_status("GNU Terry Pratchett");

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal.draw(|f| crate::app::ui::draw(f, &mut app)).unwrap();

        let mut content = String::new();
        let buffer = terminal.backend().buffer();
        for y in 0..24u16 {
            for x in 0..80u16 {
                content.push_str(buffer[(x, y)].symbol());
            }
        }

        assert!(
            content.contains("GNU Terry Pratchett"),
            "Status message should appear even in focus mode"
        );
    }

    #[test]
    fn test_draw_no_formatting_page_numbers() {
        use ratatui::{Terminal, backend::TestBackend};
        let mut app = create_empty_app();
        app.config.no_formatting = true;

        app.lines = vec!["Action line".to_string()];
        app.types = vec![LineType::Action];
        app.update_layout();

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal.draw(|f| crate::app::ui::draw(f, &mut app)).unwrap();

        let buffer = terminal.backend().buffer();
        let mut found = false;
        // Search the main content area (y > 2) to avoid matching the "1" in "v0.10.0" header
        for y in 3..23 {
            for x in 0..80 {
                let cell = &buffer[(x, y)];
                if cell.symbol() == "1" {
                    assert!(
                        !cell.modifier.contains(Modifier::BOLD),
                        "Page number should not be bold when no_formatting is true"
                    );
                    found = true;
                }
            }
        }
        assert!(found, "Page number not found");
    }

    #[test]
    fn test_draw_panel_style_resets_color() {
        use ratatui::{Terminal, backend::TestBackend};
        let mut app = create_empty_app();
        app.set_status("Test status");

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal.draw(|f| crate::app::ui::draw(f, &mut app)).unwrap();

        let buffer = terminal.backend().buffer();
        // Centered status message in 3-line footer (y=22)
        // "  Test status  " is 15 chars. (80-15)/2 = 32.
        let status_cell = &buffer[(34, 22)]; 
        assert_eq!(
            status_cell.fg,
            Color::Blue,
            "Panel should use mode background color for label"
        );
        assert!(status_cell.modifier.contains(Modifier::ITALIC));
    }

    #[test]
    fn test_draw_force_ascii_and_no_color_strips_ui_elements() {
        use ratatui::{Terminal, backend::TestBackend};

        let mut app = create_empty_app();
        app.config.force_ascii = true;
        app.config.no_color = true;

        app.lines = vec!["===".to_string(), "INT. TEST SCENE".to_string()];
        app.types = vec![LineType::PageBreak, LineType::SceneHeading];

        app.cursor_y = 1;

        app.update_layout();

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal.draw(|f| crate::app::ui::draw(f, &mut app)).unwrap();

        let mut content = String::new();
        let buffer = terminal.backend().buffer();
        for y in 0..24u16 {
            for x in 0..80u16 {
                content.push_str(buffer[(x, y)].symbol());
            }
            content.push('\n');
        }

        assert!(
            content.contains("------------------------------------------------------------"),
            "Page break should use ASCII '-' instead of Unicode '─'"
        );
        assert!(
            !content.contains("────────────────────────────────────────────────────────────"),
            "Page break should NOT contain Unicode '─' in force_ascii mode"
        );

        assert!(
            content.contains("INT. TEST SCENE"),
            "Standard text should be rendered"
        );
    }

    #[test]
    fn test_draw_typewriter_mode() {
        use ratatui::{
            Terminal,
            backend::{Backend, TestBackend},
        };
        let mut app = create_empty_app();
        app.config.typewriter_mode = true;
        app.lines = vec!["Line 1".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.update_layout();

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal.draw(|f| crate::app::ui::draw(f, &mut app)).unwrap();

        assert_eq!(terminal.backend_mut().get_cursor_position().unwrap().y, 12);
    }

    #[test]
    fn test_draw_metadata_key_dimming() {
        use ratatui::{Terminal, backend::TestBackend};
        let mut app = create_empty_app();
        app.config.no_color = false;
        app.lines = vec!["Author: René".to_string()];
        app.types = vec![LineType::MetadataKey];
        app.update_layout();

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal.draw(|f| crate::app::ui::draw(f, &mut app)).unwrap();

        let buffer = terminal.backend().buffer();
        let mut found_gray_colon = false;

        for y in 0..5 {
            for x in 0..80 {
                let cell = &buffer[(x, y)];
                if cell.symbol() == ":" {
                    assert_eq!(
                        cell.fg,
                        Color::DarkGray,
                        "Metadata key should be rendered in gray"
                    );
                    found_gray_colon = true;
                }
            }
        }
        assert!(found_gray_colon, "Metadata colon not found on screen");
    }

    #[test]
    fn test_draw_scene_tree_selected_color() {
        use ratatui::{Terminal, backend::TestBackend};
        let mut app = create_empty_app();
        app.lines = vec![
            "EXT. WOODS - DAY [[sceneclr: red]]".to_string(),
        ];
        app.parse_document();
        app.update_layout();
        app.open_scene_tree();

        let backend = TestBackend::new(80, 24);
        let mut terminal = Terminal::new(backend).unwrap();

        terminal.draw(|f| crate::app::ui::draw(f, &mut app)).unwrap();

        let buffer = terminal.backend().buffer();
        
        let mut found = false;
        for y in 0..24 {
            for x in 0..80 {
                let mut match_word = true;
                let word = "WOODS";
                for (offset, ch) in word.chars().enumerate() {
                    let cell_x = x + offset as u16;
                    if cell_x >= 80 || buffer[(cell_x, y)].symbol() != ch.to_string() {
                        match_word = false;
                        break;
                    }
                }
                if match_word {
                    let cell = &buffer[(x, y)];
                    assert!(
                        cell.fg == Color::Red || cell.fg == Color::Rgb(175, 0, 0),
                        "Expected WOODS cell to have Red foreground color, got {:?}", cell.fg
                    );
                    found = true;
                    break;
                }
            }
            if found {
                break;
            }
        }
        assert!(found, "The scene label WOODS was not found in the rendered buffer");
    }
