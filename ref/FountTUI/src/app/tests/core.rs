use super::*;

    #[test]
    fn test_app_initialization() {
        let app = create_empty_app();
        assert_eq!(app.lines.len(), 1);
        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.cursor_x, 0);
        assert!(!app.dirty);
        assert!(app.mode == AppMode::Normal);
    }

    #[test]
    fn test_app_autocomplete_character() {
        let mut app = create_empty_app();
        app.lines = vec!["@CHA".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 4;
        app.characters.insert("CHARLOTTE C.".to_string());
        app.update_autocomplete();
        assert_eq!(app.suggestion, Some("RLOTTE C.".to_string()));
    }

    #[test]
    fn test_app_autocomplete_scene_heading() {
        let mut app = create_empty_app();
        app.lines = vec![
            "INT. BIG ROOM - DAY".to_string(),
            "".to_string(),
            "INT. BI".to_string(),
        ];
        app.cursor_y = 2;
        app.cursor_x = 7;
        app.parse_document();
        app.update_autocomplete();
        assert_eq!(app.suggestion, Some("G ROOM - DAY".to_string()));
    }

    #[test]
    fn test_app_autocomplete_disabled() {
        let mut app = create_empty_app();
        app.config.autocomplete = false;

        app.lines = vec!["@CHA".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 4;
        app.characters.insert("CHARLOTTE C.".to_string());

        app.update_autocomplete();
        assert_eq!(
            app.suggestion, None,
            "Suggestion should be None when disabled"
        );
    }

    #[test]
    fn test_app_auto_paragraph_breaks_disabled() {
        let mut app = create_empty_app();
        app.config.auto_paragraph_breaks = false;

        app.lines = vec!["Action line.".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_x = 12;

        app.insert_newline(false);

        assert_eq!(app.lines.len(), 2, "Should only insert 1 newline");
        assert_eq!(app.lines[1], "");
        assert_eq!(app.cursor_y, 1);
    }

    #[test]
    fn test_report_cursor_position_empty() {
        let mut app = create_empty_app();
        app.report_cursor_position();

        assert_eq!(
            app.status_msg.as_deref(),
            Some("line 1/1 (100%), col 1/1 (100%), char 1/1 (100%)"),
            "Empty document should report 100% for all metrics"
        );
    }

    #[test]
    fn test_report_cursor_position_basic_math() {
        let mut app = create_empty_app();
        app.lines = vec!["Hello".to_string()];
        app.types = vec![LineType::Action];
        app.update_layout();

        app.cursor_y = 0;
        app.cursor_x = 2;

        app.report_cursor_position();

        assert_eq!(
            app.status_msg.as_deref(),
            Some("line 1/1 (100%), col 3/6 (50%), char 3/6 (50%)")
        );
    }

    #[test]
    fn test_report_cursor_position_soft_wrap() {
        let mut app = create_empty_app();
        let long_line = "A".repeat(100);
        app.lines = vec![long_line];
        app.types = vec![LineType::Action];
        app.update_layout();

        app.cursor_y = 0;
        app.cursor_x = 70;

        app.report_cursor_position();

        assert_eq!(
            app.status_msg.as_deref(),
            Some("line 1/1 (100%), col 71/101 (70%), char 71/101 (70%)"),
            "Soft-wrapped lines count as one logical line"
        );
    }

    #[test]
    fn test_report_cursor_position_multi_line() {
        let mut app = create_empty_app();
        app.lines = vec!["One".to_string(), "Two".to_string(), "Three".to_string()];
        app.types = vec![LineType::Action, LineType::Action, LineType::Action];
        app.update_layout();

        app.cursor_y = 1;
        app.cursor_x = 1;

        app.report_cursor_position();

        assert_eq!(
            app.status_msg.as_deref(),
            Some("line 2/3 (66%), col 2/4 (50%), char 6/14 (42%)")
        );
    }

    #[test]
    fn test_report_cursor_position_end_of_file() {
        let mut app = create_empty_app();
        app.lines = vec!["123".to_string(), "45".to_string()];
        app.types = vec![LineType::Action, LineType::Action];
        app.update_layout();

        app.cursor_y = 1;
        app.cursor_x = 2;

        app.report_cursor_position();

        assert_eq!(
            app.status_msg.as_deref(),
            Some("line 2/2 (100%), col 3/3 (100%), char 7/7 (100%)"),
            "Should safely handle cursor being positioned at the absolute end of the line"
        );
    }

    #[test]
    fn test_nano_multibuffer_indicator_persistence() {
        let mut app = create_empty_app();
        app.buffers = vec![BufferState::default(), BufferState::default()];
        app.has_multiple_buffers = true;
        app.current_buf_idx = 0;

        app.switch_next_buffer();
        assert_eq!(app.current_buf_idx, 1, "Failed to switch buffer");

        let _ = app.current_buf_idx; // check switch

        app.close_current_buffer();

        assert_eq!(app.buffers.len(), 1, "Buffer should be closed");
        assert!(
            app.has_multiple_buffers,
            "Multiple buffers flag must not be reset to false"
        );
    }

    #[test]
    fn test_buffer_state_isolation_on_switch() {
        let mut app = create_empty_app();

        app.buffers = vec![
            BufferState {
                lines: vec!["".to_string()],
                ..Default::default()
            },
            BufferState {
                lines: vec!["".to_string()],
                ..Default::default()
            },
        ];
        app.has_multiple_buffers = true;

        app.insert_char('A');
        assert_eq!(app.lines[0], "A");
        assert!(app.dirty);

        app.switch_next_buffer();
        assert_eq!(app.current_buf_idx, 1);
        assert_eq!(app.lines[0], "");
        assert!(!app.dirty);

        app.insert_char('B');
        app.insert_char('C');
        assert_eq!(app.cursor_x, 2);

        app.switch_next_buffer();
        assert_eq!(app.current_buf_idx, 0);

        assert_eq!(app.lines[0], "A");
        assert_eq!(app.cursor_x, 1);
        assert!(app.dirty);
    }

    #[test]
    fn test_app_deletion_out_of_bounds_cursor_clamp() {
        let mut app = create_empty_app();
        app.lines = vec!["Word".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 100;

        app.backspace();
        assert_eq!(
            app.cursor_x, 3,
            "Cursor should jump to line end and delete last char"
        );
        assert_eq!(app.lines[0], "Wor");
    }

    #[test]
    fn test_app_autocomplete_forced_scene_heading() {
        let mut app = create_empty_app();
        app.lines = vec![
            ".KITCHEN - DAY".to_string(),
            "".to_string(),
            ".KIT".to_string(),
        ];
        app.cursor_y = 2;
        app.cursor_x = 4;
        app.parse_document();
        app.update_autocomplete();
        assert_eq!(app.suggestion, Some("CHEN - DAY".to_string()));
    }

    #[test]
    fn test_app_autocomplete_scene_heading_without_dot() {
        let mut app = create_empty_app();
        app.lines = vec![
            "INT BIG ROOM - DAY".to_string(),
            "".to_string(),
            "INT BI".to_string(),
        ];
        app.cursor_y = 2;
        app.cursor_x = 6;
        app.parse_document();
        app.update_autocomplete();
        assert_eq!(app.suggestion, Some("G ROOM - DAY".to_string()));
    }

    #[test]
    fn test_app_no_ghost_text_while_typing_action_line() {
        let mut app = create_empty_app();
        app.characters.insert("CHARLOTTE".to_string());
        app.characters.insert("RENÉ".to_string());

        app.lines = vec!["C".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 1;

        app.update_autocomplete();

        assert_eq!(
            app.suggestion, None,
            "Typing on an Action line should NOT show ghost text unless Tab is pressed"
        );
        assert_eq!(
            app.types[0],
            LineType::Action,
            "LineType must remain Action during normal typing"
        );
    }

    #[test]
    fn test_app_deduplicate_files() {
        let cli = Cli {
            files: vec![
                std::path::PathBuf::from("test.fountain"),
                std::path::PathBuf::from("test.fountain"),
            ],
        };
        let app = App::new(cli);
        assert_eq!(app.buffers.len(), 1, "Duplicate files should be removed");
    }

    #[test]
    fn test_app_emergency_save() {
        let mut app = create_empty_app();
        app.lines = vec!["Test recovery data".to_string()];
        app.dirty = true;

        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("fount_test_recovery.fountain");
        app.file = Some(file_path.clone());

        app.emergency_save();

        let save_path = temp_dir.join("fount_test_recovery.fountain.save");
        assert!(save_path.exists());

        let _ = std::fs::remove_file(save_path);
    }

    #[test]
    fn test_app_save_command() {
        let mut app = create_empty_app();
        app.lines = vec!["Test save".to_string()];
        app.dirty = true;

        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("fount_test_save.fountain");
        app.file = Some(file_path.clone());

        assert!(app.save().is_ok());
        assert!(!app.dirty);
        assert!(file_path.exists());

        let _ = std::fs::remove_file(file_path);
    }

    #[test]
    fn test_app_mouse_scrolling() {
        use crossterm::event::{Event, MouseEvent, MouseEventKind};
        let mut app = create_empty_app();
        app.lines = vec!["1".to_string(), "2".to_string()];
        app.update_layout();

        let mut t1 = false;
        let mut t2 = false;
        let mut t3 = false;

        let scroll_down = Event::Mouse(MouseEvent {
            kind: MouseEventKind::ScrollDown,
            column: 0,
            row: 0,
            modifiers: crossterm::event::KeyModifiers::empty(),
        });
        let _ = app
            .handle_event(scroll_down, &mut t1, &mut t2, &mut t3)
            .unwrap();
        assert_eq!(app.cursor_y, 1);

        let scroll_up = Event::Mouse(MouseEvent {
            kind: MouseEventKind::ScrollUp,
            column: 0,
            row: 0,
            modifiers: crossterm::event::KeyModifiers::empty(),
        });
        let _ = app
            .handle_event(scroll_up, &mut t1, &mut t2, &mut t3)
            .unwrap();
        assert_eq!(app.cursor_y, 0);
    }

    #[test]
    fn test_app_prompt_save_logic() {
        let mut app = create_empty_app();
        app.mode = AppMode::PromptSave;

        let temp_dir = std::env::temp_dir();
        app.file = Some(temp_dir.join("dummy.fountain"));

        send_key_press(&mut app, KeyCode::Char('y'), KeyModifiers::empty());
        assert_eq!(app.mode, AppMode::Normal);

        app.mode = AppMode::PromptSave;
        app.exit_after_save = true;
        let mut t1 = false;
        let mut t2 = false;
        let mut t3 = false;
        use crossterm::event::{Event, KeyEvent, KeyEventKind, KeyEventState};
        let ev = Event::Key(KeyEvent {
            code: KeyCode::Char('n'),
            modifiers: KeyModifiers::empty(),
            kind: KeyEventKind::Press,
            state: KeyEventState::empty(),
        });
        let result = app.handle_event(ev, &mut t1, &mut t2, &mut t3).unwrap();
        assert!(
            result,
            "Should return true (exit) when 'n' pressed and exit_after_save is true"
        );
    }

    #[test]
    fn test_app_prompt_filename_logic() {
        let mut app = create_empty_app();
        app.mode = AppMode::PromptFilename;
        app.filename_input = "i like trains".to_string();

        send_key_press(&mut app, KeyCode::Char('!'), KeyModifiers::empty());
        assert_eq!(app.filename_input, "i like trains!");

        send_key_press(&mut app, KeyCode::Backspace, KeyModifiers::empty());
        assert_eq!(app.filename_input, "i like trains");

        send_key_press(&mut app, KeyCode::Esc, KeyModifiers::empty());
        assert_eq!(app.mode, AppMode::Normal);
    }

    #[test]
    fn test_app_close_last_buffer_returns_home() {
        let mut app = create_empty_app();
        assert_eq!(app.buffers.len(), 1);

        let should_exit = app.close_current_buffer();
        assert!(
            !should_exit,
            "Closing the last buffer should NOT exit the app"
        );
        assert_eq!(app.mode, AppMode::Home, "Should return to Home mode");
        assert!(app.buffers.is_empty(), "Buffers should be empty");
    }

    #[test]
    fn test_app_close_middle_buffer() {
        let mut app = create_empty_app();
        app.buffers = vec![
            BufferState {
                lines: vec!["Buf 0".to_string()],
                ..Default::default()
            },
            BufferState {
                lines: vec!["Buf 1".to_string()],
                ..Default::default()
            },
            BufferState {
                lines: vec!["Buf 2".to_string()],
                ..Default::default()
            },
        ];
        app.current_buf_idx = 1;
        app.has_multiple_buffers = true;

        let should_exit = app.close_current_buffer();

        assert!(!should_exit);
        assert_eq!(app.buffers.len(), 2);
        assert_eq!(app.current_buf_idx, 1);
        assert_eq!(app.lines[0], "Buf 2");
    }

    #[test]
    fn test_app_prompt_save_cancel_via_esc_and_ctrl_c() {
        let mut app = create_empty_app();

        app.mode = AppMode::PromptSave;
        send_key_press(&mut app, KeyCode::Esc, KeyModifiers::empty());
        assert_eq!(app.mode, AppMode::Normal);
        assert_eq!(app.status_msg.as_deref(), Some("Cancelled"));

        app.mode = AppMode::PromptSave;
        send_key_press(&mut app, KeyCode::Char('c'), KeyModifiers::CONTROL);
        assert_eq!(app.mode, AppMode::Normal);
        assert_eq!(app.status_msg.as_deref(), Some("Cancelled"));
    }

    #[test]
    fn test_app_prompt_filename_empty_input_cancels() {
        let mut app = create_empty_app();
        app.mode = AppMode::PromptFilename;
        app.filename_input = "   ".to_string();

        send_key_press(&mut app, KeyCode::Enter, KeyModifiers::empty());

        assert_eq!(app.mode, AppMode::Normal);
        assert_eq!(app.status_msg.as_deref(), Some("Cancelled"));
    }

    #[test]
    fn test_app_prompt_filename_save_error() {
        let mut app = create_empty_app();
        app.mode = AppMode::PromptFilename;
        app.filename_input =
            "/this/path/doesnt/exist/neither/does/the/meaning/of/life.fountain".to_string();

        send_key_press(&mut app, KeyCode::Enter, KeyModifiers::empty());

        assert_eq!(app.mode, AppMode::Normal);
        assert!(
            app.status_msg
                .as_deref()
                .unwrap_or("")
                .starts_with("Error saving:"),
            "An error saving message should appear"
        );
    }

    #[test]
    fn test_app_shift_enter_literal_newline() {
        let mut app = create_empty_app();
        app.lines = vec!["Action line.".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 6;
        app.config.auto_paragraph_breaks = true;

        app.insert_newline(true);

        assert_eq!(
            app.lines.len(),
            2,
            "Should be exactly 2 lines; auto-paragraphs are ignored with Shift"
        );
        assert_eq!(app.lines[0], "Action");
        assert_eq!(app.lines[1], " line.");
    }

    #[test]
    fn test_handle_event_ex_command_closes_app() {
        let mut app = create_empty_app();
        app.dirty = false;

        let (mut changed, mut moved, mut update) = (false, false, false);
        app.command_input = "ex".to_string();
        let result = app
            .execute_command(&mut changed, &mut moved, &mut update)
            .unwrap();

        assert!(result, "/ex command should return true to exit the application");
    }

    #[test]
    fn test_app_inline_note_color_parsing_strictness() {
        let mut app = create_empty_app();

        app.lines = vec![
            "[[yellow text]]".to_string(),
            "[[this comment is yellow]]".to_string(),
            "[[marker]]".to_string(),
            "[[marker blue text]]".to_string(),
            "Action with [[green inline note]] inside.".to_string(),
            "Action with [[this is not green]] inside.".to_string(),
            "[[marker invalid color]]".to_string(),
        ];

        app.parse_document();
        app.update_layout();

        let note_yellow = &app.layout[0];
        assert_eq!(
            note_yellow.override_color,
            Some(ratatui::style::Color::Yellow),
            "Note starting with yellow must be yellow"
        );

        let note_none = &app.layout[1];
        assert_eq!(
            note_none.override_color, None,
            "Color word inside the text must be ignored"
        );

        let note_marker = &app.layout[2];
        assert_eq!(
            note_marker.override_color,
            Some(ratatui::style::Color::Rgb(255, 165, 0)),
            "Marker prefix without valid color must be orange"
        );

        let note_marker_blue = &app.layout[3];
        assert_eq!(
            note_marker_blue.override_color,
            Some(ratatui::style::Color::Blue),
            "Marker prefix with blue must be blue"
        );

        let action_green = &app.layout[4];
        let color_green = action_green.fmt.note_color.values().next().copied();
        assert_eq!(
            color_green,
            Some(ratatui::style::Color::Green),
            "Inline note starting with green must be green"
        );

        let action_none = &app.layout[5];
        assert!(
            action_none.fmt.note_color.is_empty(),
            "Inline note with color word inside text must not have a color override"
        );

        let note_marker_invalid = &app.layout[6];
        assert_eq!(
            note_marker_invalid.override_color,
            Some(ratatui::style::Color::Rgb(255, 165, 0)),
            "Marker prefix with invalid color must fallback to orange"
        );
    }

    #[test]
    fn test_open_scene_tree_colors() {
        let mut app = create_empty_app();
        app.lines = vec![
            "EXT. WOODS - DAY [[sceneclr: red]]".to_string(),
            "Action line.".to_string(),
            "".to_string(),
            "[[sceneclr: blue]]".to_string(),
            "".to_string(),
            "INT. CABIN - NIGHT".to_string(),
            "[[sceneclr: green]]".to_string(),
        ];
        app.parse_document();
        app.update_layout();
        app.open_scene_tree();

        assert_eq!(app.scenes.len(), 2);
        assert_eq!(app.scenes[0].label, "EXT. WOODS - DAY");
        assert_eq!(app.scenes[0].color, Some(Color::Blue));
        assert_eq!(app.scenes[1].label, "INT. CABIN - NIGHT");
        assert_eq!(app.scenes[1].color, Some(Color::Green));
        
        app.lines = vec![
            "INT. CABIN - NIGHT".to_string(),
            "Action here.".to_string(),
            "[[sceneclr: magenta]]".to_string(),
        ];
        app.parse_document();
        app.update_layout();
        app.open_scene_tree();
        assert_eq!(app.scenes[0].color, Some(Color::Magenta));
    }

    #[test]
    fn test_forced_uppercase_transformation() {
        let mut app = create_empty_app();
        app.lines = vec![
            "ext. woods - day".to_string(), // Scene Heading
            "Action line.".to_string(),
            "".to_string(),
            "@john".to_string(),            // Character
            "He waits.".to_string(),
            "".to_string(),
            "cut to:".to_string(),          // Transition
        ];
        app.parse_document();

        assert_eq!(app.lines[0], "EXT. WOODS - DAY");
        assert_eq!(app.lines[3], "@JOHN");
        assert_eq!(app.lines[6], "CUT TO:");
        assert_eq!(app.lines[1], "Action line."); // Should stay original
    }

    #[test]
    fn test_increment_suffix_basic() {
        assert_eq!(App::increment_suffix("A"), "B");
        assert_eq!(App::increment_suffix("B"), "C");
        assert_eq!(App::increment_suffix("Y"), "Z");
    }

    #[test]
    fn test_increment_suffix_wrap() {
        assert_eq!(App::increment_suffix("Z"), "AA");
        assert_eq!(App::increment_suffix("AZ"), "BA");
        assert_eq!(App::increment_suffix("ZZ"), "AAA");
    }

    #[test]
    fn test_next_suffix_label_empty() {
        let existing: Vec<String> = vec![];
        assert_eq!(App::next_suffix_label(&existing), "A");
    }

    #[test]
    fn test_next_suffix_label_after_a_b() {
        let existing = vec!["A".to_string(), "B".to_string()];
        assert_eq!(App::next_suffix_label(&existing), "C");
    }

    #[test]
    fn test_next_suffix_label_after_z() {
        let existing = vec!["Z".to_string()];
        assert_eq!(App::next_suffix_label(&existing), "AA");
    }

    #[test]
    fn test_extract_scene_tag() {
        assert_eq!(
            App::extract_scene_tag("INT. ROOM - DAY #5#"),
            Some("5".to_string())
        );
        assert_eq!(
            App::extract_scene_tag("INT. ROOM - DAY #5A#"),
            Some("5A".to_string())
        );
        assert_eq!(App::extract_scene_tag("INT. ROOM - DAY"), None);
        assert_eq!(App::extract_scene_tag(""), None);
    }

    #[test]
    fn test_production_lock_scene_before_first_numbered() {
        let mut app = create_empty_app();
        app.lines = vec![
            "".to_string(),
            "INT. PROLOGUE".to_string(), // No tag, before first numbered scene
            "".to_string(),
            "INT. ROOM - DAY #1#".to_string(),
        ];
        app.config.production_lock = true;
        app.parse_document();

        assert_eq!(
            App::extract_scene_tag(&app.lines[1]),
            Some("0A".to_string()),
            "Scene before first numbered scene should use base 0"
        );
    }

    #[test]
    fn test_production_lock_scene_after_last_numbered() {
        let mut app = create_empty_app();
        app.lines = vec![
            "".to_string(),
            "INT. ROOM - DAY #10#".to_string(),
            "".to_string(),
            "INT. EPILOGUE".to_string(), // No tag, after last numbered
        ];
        app.config.production_lock = true;
        app.parse_document();

        assert_eq!(
            App::extract_scene_tag(&app.lines[3]),
            Some("10A".to_string()),
            "Scene after last numbered should suffix from that number"
        );
    }

    #[test]
    fn test_production_lock_off_no_auto_numbering() {
        let mut app = create_empty_app();
        app.lines = vec![
            "".to_string(),
            "INT. ROOM - DAY #1#".to_string(),
            "".to_string(),
            "INT. HALLWAY - NIGHT".to_string(),
            "".to_string(),
            "INT. KITCHEN - DAY #2#".to_string(),
        ];
        app.config.production_lock = false;
        app.parse_document();

        assert_eq!(
            App::extract_scene_tag(&app.lines[3]),
            None,
            "With lock OFF, un-numbered scenes should stay un-numbered"
        );
    }

    #[test]
    fn test_locknum_does_not_renumber() {
        let mut app = create_empty_app();
        app.lines = vec![
            "".to_string(),
            "INT. ROOM - DAY #5#".to_string(), // Custom number
            "".to_string(),
            "INT. HALLWAY - NIGHT #10#".to_string(), // Custom number
        ];
        app.parse_document();
        app.update_layout();

        let mut changed = false;
        let mut moved = false;
        let mut update = false;
        app.command_input = "locknum".to_string();
        app.mode = AppMode::Command;
        let _ = app.execute_command(&mut changed, &mut moved, &mut update);

        assert!(app.config.production_lock);
        // Custom numbers should NOT be overwritten
        assert_eq!(App::extract_scene_tag(&app.lines[1]), Some("5".to_string()));
        assert_eq!(App::extract_scene_tag(&app.lines[3]), Some("10".to_string()));
    }

    #[test]
    fn test_renum_works_regardless_of_lock() {
        let mut app = create_empty_app();
        app.lines = vec![
            "".to_string(),
            "INT. ROOM - DAY #5#".to_string(),
            "".to_string(),
            "INT. HALLWAY - NIGHT #10#".to_string(),
        ];
        app.config.production_lock = true;
        app.parse_document();
        app.update_layout();

        app.renumber_all_scenes();

        // /renum should override regardless of lock
        assert_eq!(App::extract_scene_tag(&app.lines[1]), Some("1".to_string()));
        assert_eq!(App::extract_scene_tag(&app.lines[3]), Some("2".to_string()));
    }
