use super::*;

    #[test]
    fn test_app_insert_char() {
        let mut app = create_empty_app();
        app.insert_char('A');
        assert_eq!(app.lines[0], "A");
        assert_eq!(app.cursor_x, 1);
        assert!(app.dirty);
    }

    #[test]
    fn test_app_insert_matching_parentheses() {
        let mut app = create_empty_app();
        app.insert_char('(');
        assert_eq!(app.lines[0], "()");
        assert_eq!(app.cursor_x, 1);
    }

    #[test]
    fn test_app_insert_matching_brackets() {
        let mut app = create_empty_app();
        app.insert_char('[');
        app.insert_char('[');
        assert_eq!(app.lines[0], "[[]]");
        assert_eq!(app.cursor_x, 2);
    }

    #[test]
    fn test_app_insert_matching_boneyard() {
        let mut app = create_empty_app();
        app.insert_char('/');
        app.insert_char('*');
        assert_eq!(app.lines[0], "/**/");
        assert_eq!(app.cursor_x, 2);
    }

    #[test]
    fn test_app_backspace() {
        let mut app = create_empty_app();
        app.lines = vec!["A".to_string()];
        app.cursor_x = 1;
        app.backspace();
        assert_eq!(app.lines[0], "");
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_app_backspace_matching_brackets() {
        let mut app = create_empty_app();
        app.lines = vec!["[[]]".to_string()];
        app.cursor_x = 2;
        app.backspace();
        assert_eq!(app.lines[0], "");
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_app_backspace_merge_lines() {
        let mut app = create_empty_app();
        app.lines = vec!["A".to_string(), "B".to_string()];
        app.cursor_y = 1;
        app.cursor_x = 0;
        app.backspace();
        assert_eq!(app.lines.len(), 1);
        assert_eq!(app.lines[0], "AB");
        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.cursor_x, 1);
    }

    #[test]
    fn test_app_delete_forward() {
        let mut app = create_empty_app();
        app.lines = vec!["AB".to_string()];
        app.cursor_x = 0;
        app.delete_forward();
        assert_eq!(app.lines[0], "B");
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_app_delete_forward_merge_lines() {
        let mut app = create_empty_app();
        app.lines = vec!["A".to_string(), "B".to_string()];
        app.cursor_x = 1;
        app.delete_forward();
        assert_eq!(app.lines.len(), 1);
        assert_eq!(app.lines[0], "AB");
    }

    #[test]
    fn test_app_delete_word_back() {
        let mut app = create_empty_app();
        app.lines = vec!["One Two".to_string()];
        app.cursor_x = 7;
        app.delete_word_back();
        assert_eq!(app.lines[0], "One ");
        assert_eq!(app.cursor_x, 4);
    }

    #[test]
    fn test_app_delete_word_forward() {
        let mut app = create_empty_app();
        app.lines = vec!["One Two".to_string()];
        app.cursor_x = 0;
        app.delete_word_forward();
        assert_eq!(app.lines[0], " Two");
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_app_insert_newline() {
        let mut app = create_empty_app();
        app.lines = vec!["AB".to_string()];
        app.cursor_x = 1;
        app.insert_newline(false);
        assert_eq!(app.lines.len(), 2);
        assert_eq!(app.lines[0], "A");
        assert_eq!(app.lines[1], "B");
        assert_eq!(app.cursor_y, 1);
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_app_insert_newline_auto_paragraph_breaks() {
        let mut app = create_empty_app();
        app.config.auto_paragraph_breaks = true;
        app.lines = vec!["Action line.".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_x = 12;
        app.insert_newline(false);
        assert_eq!(app.lines.len(), 3);
        assert_eq!(app.lines[0], "Action line.");
        assert_eq!(app.lines[1], "");
        assert_eq!(app.lines[2], "");
        assert_eq!(app.cursor_y, 2);
    }

    #[test]
    fn test_app_insert_newline_smart_element_escape() {
        let mut app = create_empty_app();
        app.lines = vec!["CHARLOTTE".to_string()];
        app.types = vec![LineType::Character];
        app.cursor_x = 9;
        app.insert_newline(false);
        assert_eq!(app.lines.len(), 2);
        assert_eq!(app.lines[0], "CHARLOTTE");
        assert_eq!(app.lines[1], "");
        assert_eq!(app.cursor_y, 1);
    }

    #[test]
    fn test_app_undo_redo_stack() {
        let mut app = create_empty_app();
        app.lines = vec!["Initial".to_string()];
        app.save_state(true);
        app.lines = vec!["Changed".to_string()];
        app.undo();
        assert_eq!(app.lines[0], "Initial");
        app.redo();
        assert_eq!(app.lines[0], "Changed");
    }

    #[test]
    fn test_app_cut_and_paste() {
        let mut app = create_empty_app();
        app.lines = vec!["Line 1".to_string(), "Line 2".to_string()];
        app.cut_line();
        assert_eq!(app.lines.len(), 1);
        assert_eq!(app.lines[0], "Line 2");
        app.paste_line();
        assert_eq!(app.lines.len(), 2);
        assert_eq!(app.lines[0], "Line 1");
        assert_eq!(app.lines[1], "Line 2");
    }

    #[test]
    fn test_app_cut_append_buffer() {
        let mut app = create_empty_app();
        app.lines = vec!["A".to_string(), "B".to_string(), "C".to_string()];
        app.cut_line();
        app.cut_line();
        assert_eq!(app.cut_buffer, Some("A\nB".to_string()));
    }

    #[test]
    fn test_app_tab_state_machine_empty_to_char() {
        let mut app = create_empty_app();
        app.lines = vec!["".to_string()];
        app.types = vec![LineType::Empty];
        app.handle_tab();
        assert_eq!(app.lines[0], "@");
        assert_eq!(app.cursor_x, 1);
    }

    #[test]
    fn test_app_tab_state_machine_char_to_scene() {
        let mut app = create_empty_app();
        app.lines = vec!["@".to_string()];
        app.types = vec![LineType::Character];
        app.cursor_x = 1;
        app.handle_tab();
        assert_eq!(app.lines[0], ".");
        assert_eq!(app.cursor_x, 1);
    }

    #[test]
    fn test_app_tab_state_machine_scene_to_transition() {
        let mut app = create_empty_app();
        app.lines = vec![".".to_string()];
        app.types = vec![LineType::SceneHeading];
        app.cursor_x = 1;
        app.handle_tab();
        assert_eq!(app.lines[0], ">");
        assert_eq!(app.cursor_x, 1);
    }

    #[test]
    fn test_app_tab_state_machine_transition_to_empty() {
        let mut app = create_empty_app();
        app.lines = vec![">".to_string()];
        app.types = vec![LineType::Transition];
        app.cursor_x = 1;
        app.handle_tab();
        assert_eq!(app.lines[0], "");
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_app_tab_state_machine_after_dialogue_is_paren() {
        let mut app = create_empty_app();
        app.lines = vec!["CHARLOTTE".to_string(), "".to_string()];
        app.types = vec![LineType::Character, LineType::Empty];
        app.cursor_y = 1;
        app.handle_tab();
        assert_eq!(app.lines[1], "()");
        assert_eq!(app.cursor_x, 1);
    }

    #[test]
    fn test_app_tab_dialogue_wrap() {
        let mut app = create_empty_app();
        app.lines = vec!["CHARLOTTE".to_string(), "speaking".to_string()];
        app.types = vec![LineType::Character, LineType::Dialogue];
        app.cursor_y = 1;
        app.handle_tab();
        assert_eq!(app.lines[1], "(speaking)");
    }

    #[test]
    fn test_app_tab_strip_forced_markers() {
        let mut app = create_empty_app();
        app.lines = vec!["!Force".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_x = 6;
        app.handle_tab();
        assert_eq!(app.lines[0], "Force");
        assert_eq!(app.cursor_x, 5);
    }

    #[test]
    fn test_nano_navigation_and_deletion_shortcuts() {
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

        app.lines = vec!["one two three".to_string()];
        app.cursor_x = 4;

        send_key_press(&mut app, KeyCode::Right, KeyModifiers::CONTROL);
        assert_eq!(app.cursor_x, 7, "Ctrl+Right should trigger move_word_right");

        send_key_press(&mut app, KeyCode::Backspace, KeyModifiers::CONTROL);
        assert_eq!(
            app.cursor_x, 4,
            "Ctrl+Backspace should delete word backwards"
        );

        app.switch_next_buffer();
        assert_eq!(
            app.current_buf_idx, 1,
            "switch_next_buffer (bn) failed"
        );

        app.switch_prev_buffer();
        assert_eq!(
            app.current_buf_idx, 0,
            "switch_prev_buffer (bp) failed"
        );
    }

    #[test]
    fn test_app_delete_forward_out_of_bounds_cursor_clamp() {
        let mut app = create_empty_app();
        app.lines = vec!["Word".to_string(), "Next".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 100;

        app.delete_forward();
        assert_eq!(app.cursor_x, 4);
        assert_eq!(app.lines[0], "WordNext");
        assert_eq!(app.lines.len(), 1);
    }

    #[test]
    fn test_app_tab_autocomplete_character_without_at_symbol() {
        let mut app = create_empty_app();
        app.characters.insert("CHARLOTTE".to_string());
        app.characters.insert("RENÉ".to_string());

        app.lines = vec!["C".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 1;

        app.handle_tab();

        assert_eq!(
            app.lines[0], "C",
            "Should NOT prepend '@' when a valid character match exists"
        );
        assert_eq!(app.suggestion.as_deref(), Some("HARLOTTE"));

        app.update_autocomplete();

        assert_eq!(
            app.types[0],
            LineType::Character,
            "LineType must temporarily change to Character to center the text"
        );
        assert_eq!(
            app.suggestion.as_deref(),
            Some("HARLOTTE"),
            "Suggestion must survive the update_autocomplete cycle"
        );

        app.handle_tab();

        assert_eq!(app.lines[0], "CHARLOTTE");
        assert_eq!(app.suggestion, None);
        assert_eq!(app.cursor_x, 9);
    }

    #[test]
    fn test_app_tab_autocomplete_fallback_to_at_symbol_for_unknown() {
        let mut app = create_empty_app();
        app.characters.insert("CHARLOTTE".to_string());
        app.characters.insert("RENÉ".to_string());

        app.lines = vec!["X".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 1;

        app.handle_tab();

        assert_eq!(
            app.lines[0], "@X",
            "Must fallback to prepending '@' because 'X' matches no characters"
        );
        assert_eq!(app.suggestion, None);
        assert_eq!(app.cursor_x, 2);
    }

    #[test]
    fn test_app_tab_autocomplete_fixes_case_on_accept() {
        let mut app = create_empty_app();
        app.characters.insert("RENÉ".to_string());

        app.lines = vec!["re".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 2;

        app.handle_tab();
        app.update_autocomplete();
        app.handle_tab();

        assert_eq!(
            app.lines[0], "RENÉ",
            "The existing lowercase prefix must be uppercased upon accepting the suggestion"
        );
    }

    #[test]
    fn test_app_tab_fallback_strip_sigils_restored() {
        let mut app = create_empty_app();
        app.lines = vec!["~I get a strange magic".to_string()];
        app.types = vec![LineType::Empty];
        app.cursor_y = 0;
        app.cursor_x = 12;

        app.handle_tab();

        assert_eq!(
            app.lines[0], "I get a strange magic",
            "The fallback block at the end of handle_tab must strip the '~' sigil"
        );
        assert_eq!(
            app.cursor_x, 11,
            "Cursor should shift left by 1 after stripping the sigil"
        );
    }

    #[test]
    fn test_app_tab_autocomplete_cancellation_reverts_magic() {
        let mut app = create_empty_app();
        app.characters.insert("CHARLOTTE".to_string());

        app.lines = vec!["C".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 1;

        app.handle_tab();
        app.update_autocomplete();

        assert_eq!(
            app.types[0],
            LineType::Character,
            "Sanity check: magic applied"
        );
        assert!(app.suggestion.is_some(), "Sanity check: suggestion exists");

        app.insert_char('a');

        app.parse_document();
        app.update_autocomplete();

        assert_eq!(
            app.types[0],
            LineType::Action,
            "LineType must revert to Action after the user types a new lowercase character"
        );
        assert_eq!(
            app.suggestion, None,
            "Suggestion must be cleared when the user interrupts the autocomplete flow"
        );
    }

    #[test]
    fn test_app_tab_autocomplete_exact_match_prepends_at() {
        let mut app = create_empty_app();
        app.characters.insert("RENÉ".to_string());

        app.lines = vec!["RENÉ".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 4;

        app.handle_tab();

        assert_eq!(
            app.lines[0], "@RENÉ",
            "If the typed word exactly matches a character, Tab should force a character cue by prepending '@'"
        );
        assert_eq!(app.suggestion, None);
        assert_eq!(app.cursor_x, 5);
    }

    #[test]
    fn test_app_tab_autocomplete_interrupted_by_enter() {
        let mut app = create_empty_app();
        app.characters.insert("CHARLOTTE".to_string());

        app.lines = vec!["C".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 1;

        app.handle_tab();
        app.update_autocomplete();
        assert_eq!(app.types[0], LineType::Character, "Magic is active");

        app.suggestion = None;
        app.insert_newline(false);
        app.parse_document();
        app.update_autocomplete();

        assert_eq!(app.lines.len(), 2, "Newline should be inserted");
        assert_eq!(
            app.lines[0], "C",
            "Original line must remain unchanged (no ghost text applied)"
        );
        assert_eq!(app.lines[1], "", "New line should be empty");
        assert_eq!(
            app.types[0],
            LineType::Action,
            "The magic LineType::Character MUST revert to Action because 'C' is not a valid cue"
        );
        assert_eq!(app.suggestion, None, "Suggestion must be destroyed");
    }

    #[test]
    fn test_app_tab_autocomplete_cursor_in_middle_of_word() {
        let mut app = create_empty_app();
        app.characters.insert("RENÉ".to_string());

        app.lines = vec!["Rblablabla".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 1;

        app.handle_tab();

        assert_eq!(
            app.lines[0], "@Rblablabla",
            "Should prepend '@' because the entire trimmed line ('Rblablabla') does not match 'RENÉ'"
        );
        assert_eq!(
            app.cursor_x, 2,
            "Cursor should shift right by 1 due to the prepended '@'"
        );
    }

    #[test]
    fn test_app_tab_autocomplete_trailing_space() {
        let mut app = create_empty_app();
        app.characters.insert("CHARLOTTE".to_string());

        app.lines = vec!["C ".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 2;

        app.handle_tab();

        assert_eq!(
            app.lines[0], "@C ",
            "Should safely fallback to prepending '@' when there is a trailing space"
        );
        assert_eq!(
            app.suggestion, None,
            "Suggestion must NOT be created for strings with trailing spaces"
        );
        assert_eq!(app.cursor_x, 3, "Cursor shifts by 1 because of '@'");
    }

    #[test]
    fn test_app_undo_stack_limit_truncation() {
        let mut app = create_empty_app();
        app.lines = vec!["".to_string()];

        for _i in 0..650 {
            app.insert_char('a');
            app.save_state(true);
        }

        assert!(
            app.undo_stack.len() <= 640,
            "Undo stack should be truncated at 640 (...ought to be enough for anybody)"
        );
    }

    #[test]
    fn test_app_tab_autocomplete_character_edge_case_dots() {
        let mut app = create_empty_app();
        app.lines = vec![
            "@R.C.".to_string(),
            "Text".to_string(),
            "".to_string(),
            "R".to_string(),
        ];
        app.parse_document();
        app.cursor_y = 3;
        app.cursor_x = 1;

        app.handle_tab();
        assert_eq!(
            app.suggestion.as_deref(),
            Some(".C."),
            "First Tab should offer autocomplete suggestion"
        );
        assert_eq!(app.lines[3], "R", "Line content should not change yet");

        app.parse_document();
        app.update_autocomplete();

        app.handle_tab();

        assert_eq!(
            app.lines[3], "@R.C.",
            "Should force a character cue with '@' because R.C. ends with a dot"
        );
        assert_eq!(app.cursor_x, 5, "Cursor should be at end of line");
    }

    #[test]
    fn test_app_tab_autocomplete_normal_character_regression() {
        let mut app = create_empty_app();
        app.lines = vec![
            "RENÉ".to_string(),
            "Text".to_string(),
            "".to_string(),
            "RE".to_string(),
        ];
        app.parse_document();
        app.cursor_y = 3;
        app.cursor_x = 2;

        app.update_autocomplete();
        assert_eq!(app.suggestion.as_deref(), Some("NÉ"));

        app.handle_tab();

        assert_eq!(
            app.lines[3], "RENÉ",
            "Should NOT prepend '@' for regular character names"
        );
        assert_eq!(app.cursor_x, 4);
    }

    #[test]
    fn test_app_tab_autocomplete_location_normal() {
        let mut app = create_empty_app();
        app.lines = vec![
            "INT. STADTWERKE BITTERFELD-WOLFEN - DAY".to_string(),
            "Action".to_string(),
            "".to_string(),
            ".STADT".to_string(),
        ];
        app.parse_document();
        app.cursor_y = 3;
        app.cursor_x = 6;

        app.update_autocomplete();
        assert_eq!(
            app.suggestion.as_deref(),
            Some("WERKE BITTERFELD-WOLFEN - DAY")
        );

        app.handle_tab();

        assert_eq!(
            app.lines[3], ".STADTWERKE BITTERFELD-WOLFEN - DAY",
            "Location entered with a dot prefix should not duplicate the dot"
        );
        assert_eq!(
            app.cursor_x, 35,
            "Cursor should account for the leading dot"
        );
    }

    #[test]
    fn test_app_tab_no_infinite_dots_after_non_empty_line() {
        let mut app = create_empty_app();

        app.lines = vec!["Шарлотта".to_string(), "Яблоко.".to_string()];
        app.parse_document();
        app.cursor_y = 1;
        app.cursor_x = 0;

        app.handle_tab();
        assert_eq!(app.lines[1], "@Яблоко.");
        app.parse_document();
        assert_eq!(app.lines[1], "@ЯБЛОКО.");
        assert_eq!(app.types[1], LineType::Character);

        app.handle_tab();
        assert_eq!(app.lines[1], ".ЯБЛОКО.");
        app.parse_document();
        assert_eq!(app.types[1], LineType::Action);

        app.handle_tab();
        assert_eq!(
            app.lines[1], ">ЯБЛОКО.",
            "Must turn into Transition (>), preventing infinite '@.' prepends"
        );
        app.parse_document();
        assert_eq!(app.types[1], LineType::Transition);

        app.handle_tab();
        assert_eq!(app.lines[1], "ЯБЛОКО.");
        app.parse_document();
        assert_eq!(app.types[1], LineType::Action);
    }

    #[test]
    fn test_production_lock_auto_suffix_single_insertion() {
        let mut app = create_empty_app();
        app.lines = vec![
            "".to_string(),
            "INT. ROOM - DAY #1#".to_string(),
            "".to_string(),
            "INT. HALLWAY - NIGHT".to_string(), // No tag — should get #1A#
            "".to_string(),
            "INT. KITCHEN - DAY #2#".to_string(),
        ];
        app.config.production_lock = true;
        app.parse_document();

        assert_eq!(
            App::extract_scene_tag(&app.lines[3]),
            Some("1A".to_string()),
            "New scene between #1# and #2# should get #1A#"
        );
        // Existing scenes should be untouched
        assert_eq!(App::extract_scene_tag(&app.lines[1]), Some("1".to_string()));
        assert_eq!(App::extract_scene_tag(&app.lines[5]), Some("2".to_string()));
    }

    #[test]
    fn test_production_lock_auto_suffix_multiple_insertions() {
        let mut app = create_empty_app();
        app.lines = vec![
            "".to_string(),
            "INT. ROOM - DAY #5#".to_string(),
            "".to_string(),
            "INT. HALLWAY #5A#".to_string(), // Already suffixed
            "".to_string(),
            "INT. CLOSET".to_string(), // Should get #5B#
            "".to_string(),
            "INT. KITCHEN - DAY #6#".to_string(),
        ];
        app.config.production_lock = true;
        app.parse_document();

        assert_eq!(
            App::extract_scene_tag(&app.lines[5]),
            Some("5B".to_string()),
            "Second insertion between #5# and #6# should get #5B#"
        );
        // Existing tags remain
        assert_eq!(App::extract_scene_tag(&app.lines[1]), Some("5".to_string()));
        assert_eq!(App::extract_scene_tag(&app.lines[3]), Some("5A".to_string()));
        assert_eq!(App::extract_scene_tag(&app.lines[7]), Some("6".to_string()));
    }

    #[test]
    fn test_replace_all_matches() {
        let mut app = create_empty_app();
        app.lines = vec!["Hello Mathew, how is Mathew?".to_string()];
        app.last_search = "Mathew".to_string();
        app.compiled_search_regex = regex::RegexBuilder::new("Mathew")
            .case_insensitive(true)
            .build()
            .ok();

        let count = app.replace_all_matches("John");
        assert_eq!(count, 2);
        assert_eq!(app.lines[0], "Hello John, how is John?");
    }

    #[test]
    fn test_replace_current_match() {
        let mut app = create_empty_app();
        app.lines = vec!["Hello Mathew, how is Mathew?".to_string()];
        app.last_search = "Mathew".to_string();
        app.search_matches = vec![(0, 6), (0, 21)];
        app.current_match_idx = Some(1); // The second "Mathew"

        let success = app.replace_current_match("John");
        assert!(success);
        assert_eq!(app.lines[0], "Hello Mathew, how is John?");
    }

    #[test]
    fn test_smart_newline_closing_delimiters() {
        let mut app = create_empty_app();
        app.lines = vec!["[[test]]".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 6;
        app.insert_newline(false);
        assert_eq!(app.lines.len(), 2);
        assert_eq!(app.lines[0], "[[test]]");
        assert_eq!(app.lines[1], "");
        assert_eq!(app.cursor_y, 1);
        assert_eq!(app.cursor_x, 0);

        let mut app2 = create_empty_app();
        app2.lines = vec!["/* comment */".to_string()];
        app2.cursor_y = 0;
        app2.cursor_x = 11;
        app2.insert_newline(false);
        assert_eq!(app2.lines.len(), 2);
        assert_eq!(app2.lines[0], "/* comment */");
        assert_eq!(app2.lines[1], "");

        let mut app3 = create_empty_app();
        app3.lines = vec!["**bold**".to_string()];
        app3.cursor_y = 0;
        app3.cursor_x = 6;
        app3.insert_newline(false);
        assert_eq!(app3.lines.len(), 2);
        assert_eq!(app3.lines[0], "**bold**");
        assert_eq!(app3.lines[1], "");

        let mut app4 = create_empty_app();
        app4.lines = vec![">centered<".to_string()];
        app4.cursor_y = 0;
        app4.cursor_x = 9;
        app4.insert_newline(false);
        assert_eq!(app4.lines.len(), 2);
        assert_eq!(app4.lines[0], ">centered<");
        assert_eq!(app4.lines[1], "");
    }
