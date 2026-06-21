use super::*;

    #[test]
    fn test_integration() {
        let tutorial_text = r#"Title: Fount Adventure
Credit: Written by
Author: Beetle and Bee
Draft date: Version 1.0.0
Contact:
contact@beetle.and.be

INT. BEETLE CAVE - DAY

BEETLE sits at a glowing terminal, typing.

BEETLE
(turning round)
Oh, hello there. It seems you've found Fount, the distraction-free screenplay editor. Sit back and let's craft something amazing.

We are writing a beautiful screenplay directly in our terminal using FountTUI. It feels incredibly premium, responsive, and distraction-free.

Fount is developed with maximum love and care, with a zero-panic guarantee, clean code, and zero warnings. It is designed to be the ultimate companion for screenwriters.

Anyway, let's get into it.

EXT. DIGITAL FOREST - DAY

As I mentioned, things work beautifully. If you start a line with **int.** or **ext.**, Fount will automatically turn it into a scene heading. You can also use tab: on an empty line, it will first turn it into a character cue, then a scene heading, and then a transition. If you simply start typing IN CAPS ON AN EMPTY LINE, LIKE SO, the text will automatically become a character cue.

You can also use notes...

/* Two beetles are crawling along the terminal, when one turns to the other and says: */

BEE
I'm not a bug, actually.

Fount automatically inserts two blank lines after certain elements, just as Beat does, though this can be adjusted in the configuration file. There's a sample config in the repository; do make use of it. Bonus: try enabling typewriter mode and see what happens.

To create a transition, simply write in capitals and end with a colon, like so...

CUT TO:

That alone is quite enough to write a proper screenplay. But there's more! For instance, we also have these...

/*

A multi-line comment.

For very, very, very long notes.

*/

[[Comments can look like this as well. They don't differ much from other comment types, but all comment types are fully supported.]]

#This is a new section

=And this is a synopsis.

INT. CODEBASE - EVENING

Unlike other editors, Fount is built specifically for terminal enthusiasts. Everything is optimized to look stunningly beautiful, modern, and clean.

As you may have noticed, there's support for **bold text**, *italics*, and even _underlined text_. When your cursor isn't on a line containing these markers, they'll be hidden from view. Move onto the line, and you'll see all the asterisks and underscores that produce the formatting.

Centred text is supported as well, and works like this...

>Centred text<

You can also force transitions...

>AN ABRUPT TRANSITION TO THE NEXT SCENE:

EXT. PRODUCTION ENVIRONMENT - MORNING

Lyrics are supported too, using a tilde at the start of the line...

~Meine Damen, meine Herrn, danke
~Dass Sie mit uns reisen
~Zu abgefahrenen Preisen
~Auf abgefahrenen Gleisen
~Für Ihre Leidensfähigkeit, danken wir spontan
~Sänk ju for träweling wis Deutsche Bahn

That's Wise Guys. Onwards.

EXT. RELEASE BUILD - MORNING

Well, do have a go on it, write something from scratch, or edit this screenplay. You might even turn up a bug or two; if so, please do let me know :-) Everything seemed to behave itself while I was putting this tutorial together, and I hope it all runs just as smoothly for you. I hope you enjoy working in Fount.

[[marker Speaking of which, Fount is a lovely terminal app built for creating the next generation of masterpiece screenplays.]]
[[marker blue The colour of these comment markers can be changed, as you can see.]]

You can find more information about the Fountain markup language at https://www.fountain.io/

And Fount itself, of course: https://github.com/BeetleBot/FountTUI

> FADE OUT"#;

        let mut app = create_empty_app();
        app.config.mirror_scene_numbers = crate::config::MirrorOption::Off;
        app.config.export_sections = false;
        app.config.export_synopses = false;
        app.lines = tutorial_text.lines().map(|s| s.to_string()).collect();
        app.cursor_y = 0;
        app.cursor_x = 0;

        app.parse_document();
        app.update_layout();

        let get_exact_idx =
            |search_str: &str| -> usize { app.lines.iter().position(|l| l == search_str).unwrap() };
        let get_idx = |search_str: &str| -> usize {
            app.lines
                .iter()
                .position(|l| l.starts_with(search_str))
                .unwrap()
        };

        let meta_title_idx = get_idx("Title:");
        let meta_val_idx = get_idx("contact@beetle");
        let scene1_idx = get_idx("INT. BEETLE CAVE");

        let char1_idx = get_exact_idx("BEETLE");

        let paren_idx = get_idx("(turning round)");
        let dial_idx = get_idx("Oh, hello there");
        let boneyard1_idx = get_idx("/* Two beetles");
        let trans1_idx = get_exact_idx("CUT TO:");
        let boneyard_multiline_idx = get_exact_idx("/*");
        let section_idx = get_idx("#This is");
        let syn_idx = get_idx("=And this");
        let inline_note_idx = get_idx("[[Comments");
        let markup_idx = get_idx("As you may have noticed, there's support for");
        let center_idx = get_exact_idx(">Centred text<");
        let force_trans_idx = get_idx(">AN ABRUPT");
        let lyric1_idx = get_idx("~Meine Damen");
        let lyric6_idx = get_idx("~Sänk ju");
        let note_marker_idx = get_idx("[[marker blue");
        let fade_out_idx = get_exact_idx("> FADE OUT");

        assert_eq!(app.types[meta_title_idx], LineType::MetadataTitle);
        assert_eq!(app.types[meta_val_idx], LineType::MetadataValue);
        assert_eq!(app.types[scene1_idx], LineType::SceneHeading);
        assert_eq!(app.types[char1_idx], LineType::Character);
        assert_eq!(app.types[paren_idx], LineType::Parenthetical);
        assert_eq!(app.types[dial_idx], LineType::Dialogue);
        assert_eq!(app.types[boneyard1_idx], LineType::Boneyard);
        assert_eq!(app.types[trans1_idx], LineType::Transition);
        assert_eq!(app.types[boneyard_multiline_idx], LineType::Boneyard);
        assert_eq!(app.types[section_idx], LineType::Section);
        assert_eq!(app.types[syn_idx], LineType::Synopsis);
        assert_eq!(app.types[inline_note_idx], LineType::Note);
        assert_eq!(app.types[center_idx], LineType::Centered);
        assert_eq!(app.types[force_trans_idx], LineType::Transition);
        assert_eq!(app.types[lyric1_idx], LineType::Lyrics);
        assert_eq!(app.types[lyric6_idx], LineType::Lyrics);
        assert_eq!(app.types[note_marker_idx], LineType::Note);
        assert_eq!(app.types[fade_out_idx], LineType::Transition);

        let layout_markup = app
            .layout
            .iter()
            .find(|r| r.line_idx == markup_idx)
            .unwrap();
        let styles = &layout_markup.fmt.char_styles;
        assert!(styles.iter().any(|s| s.contains(crate::formatting::StyleBits::BOLD)));
        assert!(styles.iter().any(|s| s.contains(crate::formatting::StyleBits::ITALIC)));
        assert!(styles.iter().any(|s| s.contains(crate::formatting::StyleBits::UNDERLINED)));

        let layout_note = app
            .layout
            .iter()
            .find(|r| r.line_idx == note_marker_idx)
            .unwrap();
        assert!(layout_note.override_color.is_some());
        assert_eq!(
            layout_note.override_color.unwrap(),
            ratatui::style::Color::Blue
        );

        let layout_scene = app
            .layout
            .iter()
            .find(|r| r.line_idx == scene1_idx)
            .unwrap();
        assert_eq!(layout_scene.scene_num.as_deref(), Some("1"));

        let layout_trans = app
            .layout
            .iter()
            .find(|r| r.line_idx == trans1_idx)
            .unwrap();
        let expected_indent = crate::types::PAGE_WIDTH.saturating_sub(7);
        assert_eq!(layout_trans.indent, expected_indent);
        assert_eq!(layout_trans.raw_text, "CUT TO:");

        assert!(app.characters.contains("BEETLE"));
        assert!(app.characters.contains("BEE"));
        assert!(app.locations.contains("BEETLE CAVE - DAY"));

        let total_vis_lines = app.layout.len();
        assert!(total_vis_lines > 0, "Layout must not be empty");

        let test_coordinates: Vec<(usize, usize, String, usize)> = app
            .layout
            .iter()
            .filter_map(|r| {
                if r.is_phantom {
                    None
                } else {
                    Some((r.line_idx, r.char_start, r.raw_text.clone(), r.char_end))
                }
            })
            .collect();

        for (line_idx, char_start, raw_text, char_end) in test_coordinates {
            app.cursor_y = line_idx;
            app.cursor_x = char_start;
            app.report_cursor_position();

            let status = app
                .status_msg
                .as_ref()
                .expect("Status message should be set");

            let line_part = status.split(',').next().unwrap();
            let fraction_part = line_part.split(' ').nth(1).unwrap();

            let cur_line_str = fraction_part.split('/').next().unwrap();
            let reported_line: usize = cur_line_str.parse().unwrap();

            let total_lines_str = fraction_part.split('/').nth(1).unwrap();
            let _reported_total: usize = total_lines_str.parse().unwrap();

            assert_eq!(
                reported_line,
                line_idx + 1,
                "Mismatch at logical line {} (text: '{}'). Expected logical line {}, but got {}",
                line_idx,
                raw_text,
                line_idx + 1,
                reported_line
            );

            app.cursor_x = char_end;
            app.report_cursor_position();
            assert!(
                app.status_msg.is_some(),
                "report_cursor_position panicked or failed at the end of logical line {}",
                line_idx
            );
        }

        let coords: Vec<(usize, usize, usize)> = app
            .layout
            .iter()
            .filter(|r| !r.is_phantom)
            .flat_map(|row| {
                (row.char_start..=row.char_end).map(move |cx| (row.line_idx, cx, row.char_start))
            })
            .collect();

        let mut prev_char = 0usize;
        let mut prev_line = 0usize;

        for (line_idx, cx, _) in coords {
            app.cursor_y = line_idx;
            app.cursor_x = cx;
            app.report_cursor_position();

            let status = app.status_msg.as_ref().unwrap();
            let parts: Vec<&str> = status.split(", ").collect();

            let cur_line: usize = parts[0]
                .split('/')
                .next()
                .unwrap()
                .split_whitespace()
                .nth(1)
                .unwrap()
                .parse()
                .unwrap();
            let cur_char: usize = parts[2]
                .split('/')
                .next()
                .unwrap()
                .split_whitespace()
                .nth(1)
                .unwrap()
                .parse()
                .unwrap();

            assert!(
                cur_line >= prev_line,
                "line went backwards at y={} x={}: {} -> {}",
                line_idx,
                cx,
                prev_line,
                cur_line
            );
            assert!(
                cur_char >= prev_char,
                "char went backwards at y={} x={}: {} -> {}",
                line_idx,
                cx,
                prev_char,
                cur_char
            );

            prev_char = cur_char;
            prev_line = cur_line;
        }

        app.cursor_y = app
            .lines
            .iter()
            .position(|l| l.starts_with("INT. BEETLE CAVE"))
            .unwrap();
        app.cursor_x = 0;
        app.update_layout();
        app.report_cursor_position();
        assert_eq!(
            app.status_msg.as_deref(),
            Some("line 8/93 (8%), col 1/23 (4%), char 124/3642 (3%)")
        );

        app.cursor_y = app
            .lines
            .iter()
            .position(|l| l.starts_with(">AN ABRUPT"))
            .unwrap();
        app.cursor_x = 0;
        app.update_layout();
        app.report_cursor_position();
        assert_eq!(
            app.status_msg.as_deref(),
            Some("line 67/93 (72%), col 1/41 (2%), char 2536/3642 (69%)")
        );

        app.cursor_y = app.lines.iter().position(|l| l == "> FADE OUT").unwrap();
        app.cursor_x = app.lines[app.cursor_y].chars().count();
        app.update_layout();
        app.report_cursor_position();
        assert_eq!(
            app.status_msg.as_deref(),
            Some("line 93/93 (100%), col 11/11 (100%), char 3642/3642 (100%)")
        );

        app.cursor_y = usize::MAX;
        app.update_layout();

        let render = crate::export::export_document(&app.layout, &app.lines, &app.config, &app.theme, false);

        let reference_render = r#"                      Title: Fount Adventure
                      Credit: Written by
                      Author: Beetle and Bee
                      Draft date: Version 1.0.0
                      Contact:
                        contact@beetle.and.be

     1      INT. BEETLE CAVE - DAY                                            1.

            BEETLE sits at a glowing terminal, typing.

                                BEETLE
                            (turning round)
                       Oh, hello there. It seems you've
                       found Fount, the distraction-free
                       screenplay editor. Sit back and
                       let's craft something amazing.

            We are writing a beautiful screenplay directly in our
            terminal using FountTUI. It feels incredibly premium,
            responsive, and distraction-free.

            Fount is developed with maximum love and care, with a zero-
            panic guarantee, clean code, and zero warnings. It is
            designed to be the ultimate companion for screenwriters.

            Anyway, let's get into it.

     2      EXT. DIGITAL FOREST - DAY

            As I mentioned, things work beautifully. If you start a line
            with int. or ext., Fount will automatically turn it into a
            scene heading. You can also use tab: on an empty line, it
            will first turn it into a character cue, then a scene
            heading, and then a transition. If you simply start typing
            IN CAPS ON AN EMPTY LINE, LIKE SO, the text will
            automatically become a character cue.

            You can also use notes...

                                BEE
                       I'm not a bug, actually.

            Fount automatically inserts two blank lines after certain
            elements, just as Beat does, though this can be adjusted in
            the configuration file. There's a sample config in the
            repository; do make use of it. Bonus: try enabling
            typewriter mode and see what happens.

            To create a transition, simply write in capitals and end
            with a colon, like so...

                                                                 CUT TO:

            That alone is quite enough to write a proper screenplay. But
            there's more! For instance, we also have these...

     3      INT. CODEBASE - EVENING

            Unlike other editors, Fount is built specifically for             2.
            terminal enthusiasts. Everything is optimized to look
            stunningly beautiful, modern, and clean.

            As you may have noticed, there's support for bold text,
            italics, and even underlined text. When your cursor isn't on
            a line containing these markers, they'll be hidden from
            view. Move onto the line, and you'll see all the asterisks
            and underscores that produce the formatting.

            Centred text is supported as well, and works like this...

                                    Centred text

            You can also force transitions...

                                 AN ABRUPT TRANSITION TO THE NEXT SCENE:

     4      EXT. PRODUCTION ENVIRONMENT - MORNING

            Lyrics are supported too, using a tilde at the start of the
            line...

                          Meine Damen, meine Herrn, danke
                              Dass Sie mit uns reisen
                              Zu abgefahrenen Preisen
                              Auf abgefahrenen Gleisen
                   Für Ihre Leidensfähigkeit, danken wir spontan
                      Sänk ju for träweling wis Deutsche Bahn

            That's Wise Guys. Onwards.

     5      EXT. RELEASE BUILD - MORNING

            Well, do have a go on it, write something from scratch, or
            edit this screenplay. You might even turn up a bug or two;
            if so, please do let me know :-) Everything seemed to behave
            itself while I was putting this tutorial together, and I
            hope it all runs just as smoothly for you. I hope you enjoy
            working in Fount.

            You can find more information about the Fountain markup
            language at https://www.fountain.io/

            And Fount itself, of course:
            https://github.com/BeetleBot/FountTUI

                                                                FADE OUT
"#;

        assert_eq!(
            render, reference_render,
            "Reference render does not match expected output."
        );
    }

    #[test]
    fn test_fountain_export_toggles() {
        let script = r#"Title: Sample Script
Author: John Doe

# Section 1
## Section 1.1

= Park scene description.

EXT. PARK - DAY

JOHN
Hello there! [[props: Gun]]
"#;

        let mut app = create_empty_app();
        app.lines = script.lines().map(|s| s.to_string()).collect();

        // 1. Export with everything ON
        app.config.include_title_page = true;
        app.config.export_sections = true;
        app.config.export_synopses = true;
        app.config.export_production_tags = true;

        let temp_dir = std::env::temp_dir();
        let test_path = temp_dir.join("test_fountain_export_on.fountain");
        app.export_fountain(&test_path).unwrap();
        let output_on = std::fs::read_to_string(&test_path).unwrap();
        let _ = std::fs::remove_file(&test_path);

        assert!(output_on.contains("Title: Sample Script"));
        assert!(output_on.contains("# Section 1"));
        assert!(output_on.contains("= Park scene description."));
        assert!(output_on.contains("[[props: Gun]]"));

        // 2. Export with everything OFF
        app.config.include_title_page = false;
        app.config.export_sections = false;
        app.config.export_synopses = false;
        app.config.export_production_tags = false;

        let test_path_off = temp_dir.join("test_fountain_export_off.fountain");
        app.export_fountain(&test_path_off).unwrap();
        let output_off = std::fs::read_to_string(&test_path_off).unwrap();
        let _ = std::fs::remove_file(&test_path_off);

        assert!(!output_off.contains("Title:"));
        assert!(!output_off.contains("Sample Script"));
        assert!(!output_off.contains("# Section 1"));
        assert!(!output_off.contains("= Park scene description."));
        assert!(!output_off.contains("[[props: Gun]]"));
        // Dialogue and scene heading should still be there
        assert!(output_off.contains("EXT. PARK - DAY"));
        assert!(output_off.contains("Hello there!"));
    }
