use super::*;

    #[test]
    fn test_app_utf8_cursor_navigation_and_deletion() {
        let mut app = create_empty_app();

        app.lines = vec!["Привет, мир!".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 7;

        app.backspace();

        assert_eq!(app.lines[0], "Привет мир!");
        assert_eq!(app.cursor_x, 6);

        app.backspace();
        assert_eq!(app.lines[0], "Приве мир!");
        assert_eq!(app.cursor_x, 5);
    }

    #[test]
    fn test_app_word_navigation_utf8() {
        let mut app = create_empty_app();
        app.lines = vec!["Сценарий номер один".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 0;

        app.move_word_right();
        assert_eq!(app.cursor_x, 8);

        app.move_word_right();
        assert_eq!(app.cursor_x, 14);

        app.move_word_left();
        assert_eq!(app.cursor_x, 9);
    }

    #[test]
    fn test_ux_boundary_beginning_of_file() {
        let mut app = create_empty_app();
        app.lines = vec!["First".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 0;

        app.move_up();
        app.move_left();
        app.move_word_left();
        app.backspace();

        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.cursor_x, 0);
        assert_eq!(app.lines[0], "First");
    }

    #[test]
    fn test_ux_boundary_end_of_file() {
        let mut app = create_empty_app();
        app.lines = vec!["Last".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 4;

        app.move_down();
        app.move_right();
        app.move_word_right();
        app.delete_forward();

        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.cursor_x, 4);
        assert_eq!(app.lines[0], "Last");
    }

    #[test]
    fn test_ux_line_joining_backspace() {
        let mut app = create_empty_app();
        app.lines = vec!["Hello ".to_string(), "World".to_string()];
        app.cursor_y = 1;
        app.cursor_x = 0;

        app.backspace();

        assert_eq!(app.lines.len(), 1);
        assert_eq!(app.lines[0], "Hello World");
        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.cursor_x, 6);
    }

    #[test]
    fn test_ux_line_joining_delete() {
        let mut app = create_empty_app();
        app.lines = vec!["Hello ".to_string(), "World".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 6;

        app.delete_forward();

        assert_eq!(app.lines.len(), 1);
        assert_eq!(app.lines[0], "Hello World");
        assert_eq!(app.cursor_y, 0);
        assert_eq!(app.cursor_x, 6);
    }

    #[test]
    fn test_ux_line_splitting_enter() {
        let mut app = create_empty_app();
        app.lines = vec!["HelloWorld".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 5;

        app.insert_newline(false);

        assert_eq!(app.lines.len(), 2);
        assert_eq!(app.lines[0], "Hello");
        assert_eq!(app.lines[1], "World");
        assert_eq!(app.cursor_y, 1);
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_ux_utf8_multibyte_safety() {
        let mut app = create_empty_app();

        app.lines = vec!["пути творчества".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 15;

        app.delete_word_back();
        app.backspace();

        app.insert_char('н');
        app.insert_char(' ');
        app.insert_char('🦀');

        assert_eq!(app.lines[0], "путин 🦀");
        app.cursor_x = 7;

        app.backspace();
        assert_eq!(app.lines[0], "путин ", "backspace should delete emoji");
        assert_eq!(
            app.cursor_x, 6,
            "cursor should move back once after deleting emoji"
        );

        app.backspace();
        assert_eq!(
            app.lines[0], "путин",
            "backspace should delete trailing space"
        );
        assert_eq!(app.cursor_x, 5, "cursor should be at end of word");

        app.insert_char(' ');
        app.insert_char('х');
        app.insert_char('у');
        app.insert_char('й');
        app.insert_char('л');
        app.insert_char('о');
        assert_eq!(
            app.lines[0], "путин хуйло",
            "insert_char should append correctly"
        );
        assert_eq!(app.cursor_x, 11, "cursor should be at end after inserts");

        app.cursor_x = 0;
        for _ in 0..6 {
            app.delete_forward();
        }
        assert_eq!(
            app.lines[0], "хуйло",
            "delete_forward should remove first word char by char"
        );
        assert_eq!(app.cursor_x, 0, "cursor should stay at position 0");

        app.cursor_x = 5;
        app.backspace();
        app.backspace();
        assert_eq!(
            app.lines[0], "хуй",
            "delete_word_back should remove last two chars"
        );
        assert_eq!(app.cursor_x, 3, "cursor should be at end of remaining word");
    }

    #[test]
    fn test_ux_visual_up_down_inside_soft_wrapped_line() {
        let mut app = create_empty_app();
        let long_line = "A".repeat(100);
        app.lines = vec!["Short line".to_string(), long_line];
        app.types = vec![LineType::Action, LineType::Action];

        app.update_layout();

        app.cursor_y = 1;
        app.cursor_x = 80;
        app.target_visual_x = 20;

        app.move_up();

        assert_eq!(
            app.cursor_y, 1,
            "Cursor should stay on the same logical line"
        );
        assert_eq!(
            app.cursor_x, 20,
            "Cursor should move to the upper visual row of the soft-wrapped line"
        );

        app.move_down();
        assert_eq!(app.cursor_y, 1);
        assert_eq!(
            app.cursor_x, 80,
            "Cursor should return to the lower visual row"
        );
    }

    #[test]
    fn test_ux_smart_pairing_deletion() {
        let mut app = create_empty_app();
        app.lines = vec!["()".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 1;

        app.backspace();
        assert_eq!(app.lines[0], "");
        assert_eq!(app.cursor_x, 0);
    }

    #[test]
    fn test_ux_undo_restores_cursor_position_perfectly() {
        let mut app = create_empty_app();
        app.lines = vec!["Some text".to_string()];
        app.cursor_y = 0;
        app.cursor_x = 5;

        app.save_state(true);

        app.insert_char('A');
        assert_eq!(app.cursor_x, 6);

        app.undo();

        assert_eq!(app.lines[0], "Some text");
        assert_eq!(app.cursor_x, 5);
    }

    #[test]
    fn test_ux_ghost_cursor_memory_target_x() {
        let mut app = create_empty_app();
        app.lines = vec!["a".repeat(20), "b".repeat(3), "c".repeat(20)];

        app.parse_document();

        app.cursor_y = 0;
        app.cursor_x = 15;
        app.update_layout();
        app.target_visual_x = app.current_visual_x();

        app.move_down();
        assert_eq!(app.cursor_y, 1);
        assert_eq!(app.cursor_x, 3);

        app.move_down();
        assert_eq!(app.cursor_y, 2);

        assert_eq!(
            app.cursor_x, 15,
            "Cursor forgot its target_visual_x memory!"
        );
    }

    #[test]
    fn test_ux_tab_state_machine_middle_of_line() {
        let mut app = create_empty_app();
        app.lines = vec!["Some text here".to_string()];
        app.types = vec![LineType::Action];
        app.cursor_y = 0;
        app.cursor_x = 5;

        app.handle_tab();

        assert_eq!(app.lines[0], "@Some text here");
        assert_eq!(
            app.cursor_x, 6,
            "Cursor must shift right when a sigil is prepended!"
        );
    }

    #[test]
    fn test_report_cursor_position_utf8_multibyte() {
        let mut app = create_empty_app();

        app.lines = vec!["Дратути 👋".to_string()];
        app.types = vec![LineType::Action];
        app.update_layout();

        app.cursor_y = 0;
        app.cursor_x = 8;

        app.report_cursor_position();

        assert_eq!(
            app.status_msg.as_deref(),
            Some("line 1/1 (100%), col 9/10 (90%), char 9/10 (90%)"),
            "Cursor metrics should count UTF-8 chars, not raw bytes"
        );
    }

    #[test]
    fn test_ux_smart_pairing_basic_triggers() {
        let mut app = create_empty_app();

        app.insert_char('(');
        assert_eq!(app.lines[0], "()", "Failed to auto-pair parentheses");
        assert_eq!(
            app.cursor_x, 1,
            "Cursor should be placed inside the parentheses"
        );
        assert!(app.dirty, "Document should be marked dirty after insertion");

        app.lines = vec!["".to_string()];
        app.cursor_x = 0;
        app.insert_char('"');
        assert_eq!(app.lines[0], "\"\"", "Failed to auto-pair double quotes");
        assert_eq!(
            app.cursor_x, 1,
            "Cursor should be placed inside the double quotes"
        );

        app.lines = vec!["".to_string()];
        app.cursor_x = 0;
        app.insert_char('\'');
        assert_eq!(app.lines[0], "''", "Failed to auto-pair single quotes");
        assert_eq!(
            app.cursor_x, 1,
            "Cursor should be placed inside the single quotes"
        );
    }

    #[test]
    fn test_ux_smart_pairing_step_over_existing_closing_chars() {
        let mut app = create_empty_app();

        app.lines = vec!["()".to_string()];
        app.cursor_x = 1;
        app.insert_char(')');
        assert_eq!(
            app.lines[0], "()",
            "Should step over existing closing parenthesis"
        );
        assert_eq!(
            app.cursor_x, 2,
            "Cursor should advance past the closing parenthesis"
        );

        app.lines = vec!["\"\"".to_string()];
        app.cursor_x = 1;
        app.insert_char('"');
        assert_eq!(
            app.lines[0], "\"\"",
            "Should step over existing closing double quote"
        );
        assert_eq!(
            app.cursor_x, 2,
            "Cursor should advance past the closing double quote"
        );

        app.lines = vec!["''".to_string()];
        app.cursor_x = 1;
        app.insert_char('\'');
        assert_eq!(
            app.lines[0], "''",
            "Should step over existing closing single quote"
        );
        assert_eq!(
            app.cursor_x, 2,
            "Cursor should advance past the closing single quote"
        );

        app.lines = vec!["[[]]".to_string()];
        app.cursor_x = 2;
        app.insert_char(']');
        assert_eq!(
            app.lines[0], "[[]]",
            "Should step over existing closing bracket in Fountain notes"
        );
        assert_eq!(
            app.cursor_x, 3,
            "Cursor should advance past the first closing bracket"
        );
    }

    #[test]
    fn test_ux_smart_pairing_alphanumeric_boundary_rules() {
        let mut app = create_empty_app();

        app.lines = vec!["word".to_string()];
        app.cursor_x = 0;
        app.insert_char('(');
        assert_eq!(
            app.lines[0], "(word",
            "Should not auto-pair when directly preceding an alphanumeric character"
        );
        assert_eq!(app.cursor_x, 1, "Cursor should advance normally");

        app.lines = vec!["word".to_string()];
        app.cursor_x = 0;
        app.insert_char('"');
        assert_eq!(
            app.lines[0], "\"word",
            "Should not auto-pair double quotes when directly preceding a word"
        );

        app.lines = vec![" word".to_string()];
        app.cursor_x = 0;
        app.insert_char('(');
        assert_eq!(
            app.lines[0], "() word",
            "Should auto-pair when preceding whitespace"
        );

        app.lines = vec!["don".to_string()];
        app.cursor_x = 3;
        app.insert_char('\'');
        assert_eq!(
            app.lines[0], "don'",
            "Single quote immediately following an alphanumeric character must be treated as an apostrophe, not a pair"
        );

        app.lines = vec!["don ".to_string()];
        app.cursor_x = 4;
        app.insert_char('\'');
        assert_eq!(
            app.lines[0], "don ''",
            "Single quote following a space must be treated as a pairable quote"
        );
    }

    #[test]
    fn test_ux_smart_pairing_quote_parity_and_apostrophe_logic() {
        let mut app = create_empty_app();

        app.lines = vec!["\"hello\"".to_string()];
        app.cursor_x = 6;
        app.insert_char('"');
        assert_eq!(
            app.lines[0], "\"hello\"",
            "Should recognize odd parity inside a string and step over the closing quote"
        );
        assert_eq!(app.cursor_x, 7, "Cursor should advance past the quote");

        app.lines = vec!["\"hello\" ".to_string()];
        app.cursor_x = 8;
        app.insert_char('"');
        assert_eq!(
            app.lines[0], "\"hello\" \"\"",
            "Should recognize even parity outside strings and create a new pair"
        );
        assert_eq!(
            app.cursor_x, 9,
            "Cursor should be placed inside the new pair"
        );

        app.lines = vec!["don't say ".to_string()];
        app.cursor_x = 10;
        app.insert_char('"');
        assert_eq!(
            app.lines[0], "don't say \"\"",
            "Apostrophes must be strictly excluded from string literal parity counts"
        );
        assert_eq!(
            app.cursor_x, 11,
            "Cursor should be placed inside the double quotes"
        );

        app.lines = vec!["don't say ".to_string()];
        app.cursor_x = 10;
        app.insert_char('\'');
        assert_eq!(
            app.lines[0], "don't say ''",
            "Apostrophes must not prevent single quotes from pairing properly in valid contexts"
        );
    }

    #[test]
    fn test_ux_smart_pairing_fountain_multichar_elements() {
        let mut app = create_empty_app();

        app.lines = vec!["[".to_string()];
        app.cursor_x = 1;
        app.insert_char('[');
        assert_eq!(
            app.lines[0], "[[]]",
            "Consecutive open brackets must trigger Fountain note auto-completion"
        );
        assert_eq!(
            app.cursor_x, 2,
            "Cursor must be placed inside the Fountain note"
        );

        app.lines = vec!["/".to_string()];
        app.cursor_x = 1;
        app.insert_char('*');
        assert_eq!(
            app.lines[0], "/**/",
            "Slash followed by asterisk must trigger boneyard auto-completion"
        );
        assert_eq!(
            app.cursor_x, 2,
            "Cursor must be placed inside the boneyard markers"
        );

        app.lines = vec!["*".to_string()];
        app.cursor_x = 1;
        app.insert_char('*');
        assert_eq!(
            app.lines[0], "****",
            "Consecutive asterisks must trigger bold markdown auto-completion"
        );
        assert_eq!(
            app.cursor_x, 2,
            "Cursor must be placed inside the bold markers"
        );
    }

    #[test]
    fn test_ux_smart_pairing_unicode_and_emoji_boundaries() {
        let mut app = create_empty_app();

        app.lines = vec!["слово".to_string()];
        app.cursor_x = 0;
        app.insert_char('(');
        assert_eq!(
            app.lines[0], "(слово",
            "Cyrillic characters must be treated as alphanumeric, preventing auto-pairing"
        );

        app.lines = vec!["🦀".to_string()];
        app.cursor_x = 0;
        app.insert_char('(');
        assert_eq!(
            app.lines[0], "()🦀",
            "Emojis are not alphanumeric and must allow auto-pairing"
        );

        app.lines = vec!["Д".to_string()];
        app.cursor_x = 1;
        app.insert_char('\'');
        assert_eq!(
            app.lines[0], "Д'",
            "Apostrophe logic must correctly identify Cyrillic boundaries"
        );

        app.lines = vec!["Привет()Мир".to_string()];
        app.cursor_x = 7;
        app.backspace();
        assert_eq!(
            app.lines[0], "ПриветМир",
            "Pair deletion must respect multi-byte character boundaries during string mutation"
        );
        assert_eq!(
            app.cursor_x, 6,
            "Cursor must strictly track character indexing, not byte indexing, after pair deletion"
        );
    }
