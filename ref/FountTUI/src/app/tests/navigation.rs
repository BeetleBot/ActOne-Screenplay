use super::*;

    #[test]
    fn test_app_move_down() {
        let mut app = create_empty_app();
        app.lines = vec!["Line 1".to_string(), "Line 2".to_string()];
        app.parse_document();
        app.update_layout();
        app.move_down();
        assert_eq!(app.cursor_y, 1);
    }

    #[test]
    fn test_app_move_up() {
        let mut app = create_empty_app();
        app.lines = vec!["Line 1".to_string(), "Line 2".to_string()];
        app.cursor_y = 1;
        app.parse_document();
        app.update_layout();
        app.move_up();
        assert_eq!(app.cursor_y, 0);
    }

    #[test]
    fn test_app_move_right() {
        let mut app = create_empty_app();
        app.lines = vec!["123".to_string(), "456".to_string()];
        app.move_right();
        assert_eq!(app.cursor_x, 1);
        app.move_right();
        app.move_right();
        assert_eq!(app.cursor_x, 3);
        app.move_right();
        assert_eq!(app.cursor_y, 1);
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_app_move_left() {
        let mut app = create_empty_app();
        app.lines = vec!["123".to_string(), "456".to_string()];
        app.cursor_y = 1;
        app.cursor_x = 0;
        app.move_left();
        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.cursor_x, 3);
        app.move_left();
        assert_eq!(app.cursor_x, 2);
    }

    #[test]
    fn test_app_move_word_right() {
        let mut app = create_empty_app();
        app.lines = vec!["Word one two".to_string()];
        app.move_word_right();
        assert_eq!(app.cursor_x, 4);
        app.move_word_right();
        assert_eq!(app.cursor_x, 8);
    }

    #[test]
    fn test_app_move_word_left() {
        let mut app = create_empty_app();
        app.lines = vec!["Word one two".to_string()];
        app.cursor_x = 9;
        app.move_word_left();
        assert_eq!(app.cursor_x, 5);
        app.move_word_left();
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_app_move_home_and_end() {
        let mut app = create_empty_app();
        app.lines = vec!["End of line".to_string()];
        app.move_end();
        assert_eq!(app.cursor_x, 11);
        app.move_home();
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_app_search_forward() {
        let mut app = create_empty_app();
        app.lines = vec!["Alpha".to_string(), "Beta".to_string(), "Gamma".to_string()];
        app.search_query = "eta".to_string();
        app.execute_search();
        assert_eq!(app.cursor_y, 1);
        assert_eq!(app.cursor_x, 1);
        assert_eq!(app.mode, AppMode::Normal);
    }

    #[test]
    fn test_app_search_wrap_around() {
        let mut app = create_empty_app();
        app.lines = vec!["Alpha".to_string(), "Beta".to_string(), "Gamma".to_string()];
        app.cursor_y = 2;
        app.search_query = "lph".to_string();
        app.execute_search();
        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.cursor_x, 1);
    }

    #[test]
    fn test_app_search_regex_not_found() {
        let mut app = create_empty_app();
        app.lines = vec!["World".to_string()];
        app.search_query = "god".to_string();

        app.execute_search();

        assert_eq!(app.cursor_y, 0, "Cursor should not move");
        assert_eq!(app.status_msg.as_deref(), Some("\"god\" not found"));
        assert!(
            !app.show_search_highlight,
            "Highlight should be disabled if not found"
        );
    }

    #[test]
    fn test_search_regex_basic_and_highlight_flag() {
        let mut app = create_empty_app();
        app.lines = vec!["Hello world".to_string(), "Line two".to_string()];
        app.search_query = "world".to_string();
        app.cursor_y = 0;
        app.cursor_x = 0;

        app.execute_search();

        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.cursor_x, 6);
        assert!(
            app.show_search_highlight,
            "Highlight flag should be active after finding"
        );
    }

    #[test]
    fn test_search_regex_wrap_around() {
        let mut app = create_empty_app();
        app.lines = vec!["First target".to_string(), "Second line".to_string()];
        app.search_query = "target".to_string();
        app.cursor_y = 1;
        app.cursor_x = 0;

        app.execute_search();

        assert_eq!(app.cursor_y, 0, "Should wrap around to line 0");
        assert_eq!(app.cursor_x, 6, "Index of 't' in 'target'");
        assert_eq!(
            app.status_msg.as_deref(),
            Some("Search Wrapped ( Match 1 of 1 )"),
            "Should display wrapped status message"
        );
    }

    #[test]
    fn test_search_regex_utf8_multibyte_safety() {
        let mut app = create_empty_app();

        app.lines = vec!["путин 🦀 краб".to_string()];
        app.search_query = "краб".to_string();
        app.cursor_y = 0;
        app.cursor_x = 0;

        app.execute_search();

        assert_eq!(
            app.cursor_x, 8,
            "Search must correctly convert byte offsets to char offsets"
        );
    }

    #[test]
    fn test_search_highlight_cleared_on_escape() {
        use crossterm::event::{
            Event, KeyCode, KeyEvent, KeyEventKind, KeyEventState, KeyModifiers,
        };

        let mut app = create_empty_app();
        app.lines = vec!["Target word".to_string()];
        app.search_query = "word".to_string();
        app.execute_search();

        assert!(app.show_search_highlight);

        let esc_event = Event::Key(KeyEvent {
            code: KeyCode::Esc,
            modifiers: KeyModifiers::empty(),
            kind: KeyEventKind::Press,
            state: KeyEventState::empty(),
        });

        let mut update_x = false;
        let mut text_ch = false;
        let mut cur_moved = false;

        let _ = app
            .handle_event(esc_event, &mut update_x, &mut text_ch, &mut cur_moved)
            .unwrap();

        assert!(
            !app.show_search_highlight,
            "Highlight flag should be reset when pressing Escape"
        );
        assert!(
            text_ch,
            "Text changed flag should trigger redraw to clear highlights"
        );
    }

    #[test]
    fn test_move_page_down_and_up() {
        let mut app = create_empty_app();
        app.lines = (0..50).map(|i| format!("Line {}", i)).collect();
        app.parse_document();
        app.update_layout();
        app.visible_height = 10;

        app.move_page_down();
        assert_eq!(app.cursor_y, 10);

        app.move_page_up();
        assert_eq!(app.cursor_y, 0);
    }

    #[test]
    fn test_app_vertical_movement_cursor_clamp() {
        let mut app = create_empty_app();
        app.lines = vec![
            "Short".to_string(),
            "A very long line indeed".to_string(),
            "Tiny".to_string(),
        ];
        app.types = vec![LineType::Action, LineType::Action, LineType::Action];
        app.update_layout();

        app.cursor_y = 1;
        app.cursor_x = 20;
        app.target_visual_x = 20;

        app.move_up();
        assert_eq!(app.cursor_y, 0);
        assert_eq!(
            app.cursor_x, 5,
            "Cursor should be clamped to the length of 'Short'"
        );

        app.cursor_y = 1;
        app.cursor_x = 20;

        app.move_down();
        assert_eq!(app.cursor_y, 2);
        assert_eq!(
            app.cursor_x, 4,
            "Cursor should be clamped to the length of 'Tiny'"
        );
    }

    #[test]
    fn test_app_search_cancel_via_esc_and_ctrl_c() {
        let mut app = create_empty_app();

        app.mode = AppMode::Search;
        app.search_query = "something".to_string();
        app.show_search_highlight = true;

        send_key_press(&mut app, KeyCode::Esc, KeyModifiers::empty());

        assert_eq!(app.mode, AppMode::Normal);
        assert!(!app.show_search_highlight);
        assert!(app.search_query.is_empty(), "Query should be cleared");
        assert_eq!(app.status_msg.as_deref(), Some("Cancelled"));
    }

    #[test]
    fn test_app_search_backspace_to_empty_and_enter() {
        let mut app = create_empty_app();
        app.mode = AppMode::Search;
        app.search_query = "a".to_string();

        send_key_press(&mut app, KeyCode::Backspace, KeyModifiers::empty());
        assert!(app.search_query.is_empty());

        send_key_press(&mut app, KeyCode::Enter, KeyModifiers::empty());

        assert_eq!(app.mode, AppMode::Normal);
        assert_eq!(app.status_msg.as_deref(), Some("Cancelled"));
    }

    #[test]
    fn test_ux_smart_pairing_backspace_removes_both_pairs_safely() {
        let mut app = create_empty_app();

        let pairs_to_test = vec![
            ("()", 1),
            ("\"\"", 1),
            ("''", 1),
            ("[[]]", 2),
            ("/**/", 2),
            ("****", 2),
        ];

        for (text, cursor_pos) in pairs_to_test {
            app.lines = vec![text.to_string()];
            app.cursor_x = cursor_pos;
            app.backspace();
            assert_eq!(
                app.lines[0], "",
                "Backspace failed to cleanly remove the empty pair sequence: {}",
                text
            );
            assert_eq!(
                app.cursor_x, 0,
                "Cursor should return to position 0 after pair deletion"
            );
        }
    }

    #[test]
    fn test_ux_smart_pairing_delete_forward_removes_both_pairs_safely() {
        let mut app = create_empty_app();

        let pairs_to_test = vec![
            ("()", 0),
            ("\"\"", 0),
            ("''", 0),
            ("[[]]", 0),
            ("/**/", 0),
            ("****", 0),
        ];

        for (text, cursor_pos) in pairs_to_test {
            app.lines = vec![text.to_string()];
            app.cursor_x = cursor_pos;
            app.delete_forward();
            assert_eq!(
                app.lines[0], "",
                "Forward delete failed to cleanly remove the empty pair sequence: {}",
                text
            );
            assert_eq!(
                app.cursor_x, 0,
                "Cursor should remain at position 0 after pair deletion"
            );
        }
    }

    #[test]
    fn test_app_search_match_count() {
        let mut app = create_empty_app();
        app.lines = vec![
            "needle one".to_string(),
            "no match".to_string(),
            "needle two".to_string(),
            "last needle".to_string(),
        ];
        app.search_query = "needle".to_string();
        
        // Initial search (from 0,0 - jumps to next match at 2,0)
        app.execute_search();
        assert_eq!(app.cursor_y, 2);
        assert_eq!(app.search_matches.len(), 3);
        assert_eq!(app.current_match_idx, Some(1));
        
        // Jump to next (3,5)
        app.jump_to_match(true);
        assert_eq!(app.cursor_y, 3);
        assert_eq!(app.current_match_idx, Some(2));
        
        // Jump to next (wraps to 0,0)
        app.jump_to_match(true);
        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.current_match_idx, Some(0));
        
        // Jump to prev (wraps to 3,5)
        app.jump_to_match(false);
        assert_eq!(app.cursor_y, 3);
        assert_eq!(app.current_match_idx, Some(2));
        
        // Jump to prev again (2,0)
        app.jump_to_match(false);
        assert_eq!(app.cursor_y, 2);
        assert_eq!(app.current_match_idx, Some(1));
    }

    #[test]
    fn test_alt_slash_populates_last_command() {
        let mut app = create_empty_app();
        app.last_command = "theme adaptive".to_string();
        
        send_key_press(&mut app, KeyCode::Char('/'), KeyModifiers::ALT);
        
        assert_eq!(app.mode, AppMode::Command);
        assert_eq!(app.command_input, "theme adaptive");
    }
