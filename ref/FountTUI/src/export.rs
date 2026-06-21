use ratatui::style::{Color, Modifier, Style};
use unicode_width::UnicodeWidthStr;

use crate::config::Config;
use crate::theme::Theme;
use crate::formatting::{RenderConfig, StringCaseExt, render_inline};
use crate::layout::{VisualRow, strip_sigils};
use crate::types::{LineType, PAGE_WIDTH, base_style};

fn style_to_ansi(style: Style, text: &str) -> String {
    if text.is_empty() {
        return String::new();
    }

    let mut ansi = String::new();

    if style.add_modifier.contains(Modifier::BOLD) {
        ansi.push_str("\x1b[1m");
    }
    if style.add_modifier.contains(Modifier::ITALIC) {
        ansi.push_str("\x1b[3m");
    }
    if style.add_modifier.contains(Modifier::UNDERLINED) {
        ansi.push_str("\x1b[4m");
    }

    if let Some(fg) = style.fg {
        match fg {
            Color::Reset => {}
            Color::Black => ansi.push_str("\x1b[30m"),
            Color::Red => ansi.push_str("\x1b[31m"),
            Color::Green => ansi.push_str("\x1b[32m"),
            Color::Yellow => ansi.push_str("\x1b[33m"),
            Color::Blue => ansi.push_str("\x1b[34m"),
            Color::Magenta => ansi.push_str("\x1b[35m"),
            Color::Cyan => ansi.push_str("\x1b[36m"),
            Color::Gray => ansi.push_str("\x1b[37m"),
            Color::DarkGray => ansi.push_str("\x1b[90m"),
            Color::White => ansi.push_str("\x1b[97m"),
            Color::Rgb(r, g, b) => ansi.push_str(&format!("\x1b[38;2;{};{};{}m", r, g, b)),
            _ => {}
        }
    }

    ansi.push_str(text);

    if !style.add_modifier.is_empty() || style.fg.is_some_and(|c| !matches!(c, Color::Reset)) {
        ansi.push_str("\x1b[0m");
    }

    ansi
}

pub fn export_document(
    layout: &[VisualRow],
    lines: &[String],
    config: &Config,
    theme: &Theme,
    with_ansi: bool,
) -> String {
    let mut output = String::with_capacity(layout.len() * 80);
    let global_pad = 12usize;
    let gap_size = 6usize;

    let mut skipped_comment = false;
    let empty_highlights = std::collections::HashSet::new();

    let mirror_scenes = config.mirror_scene_numbers == crate::config::MirrorOption::Always
        || config.mirror_scene_numbers == crate::config::MirrorOption::ExportOnly;

    for row in layout {
        if matches!(row.line_type, LineType::Boneyard | LineType::Note) {
            skipped_comment = true;
            continue;
        }

        if row.line_type == LineType::Section && !config.export_sections {
            skipped_comment = true;
            continue;
        }

        if row.line_type == LineType::Synopsis && !config.export_synopses {
            skipped_comment = true;
            continue;
        }

        if (row.raw_text.is_empty() && row.scene_num.is_none()) && row.page_num.is_none() {
            if row.line_type == LineType::Empty && skipped_comment {
                skipped_comment = false;
                continue;
            }
            output.push('\n');
            continue;
        }

        skipped_comment = false;

        let mut line_str = String::new();
        let mut visual_width = 0usize;

        if let Some(ref snum) = row.scene_num {
            let s_str = snum.to_string();
            let s_len = s_str.chars().count();

            if global_pad > s_len + gap_size {
                let pad = global_pad - s_len - gap_size;
                line_str.push_str(&" ".repeat(pad));
                visual_width += pad;

                if with_ansi {
                    line_str.push_str(&format!("\x1b[90m{}\x1b[0m", s_str));
                } else {
                    line_str.push_str(&s_str);
                }
                visual_width += s_len;

                line_str.push_str(&" ".repeat(gap_size));
                visual_width += gap_size;
            } else {
                if with_ansi {
                    line_str.push_str(&format!("\x1b[90m{}\x1b[0m ", s_str));
                } else {
                    line_str.push_str(&format!("{} ", s_str));
                }
                visual_width += s_len + 1;
            }
        } else {
            line_str.push_str(&" ".repeat(global_pad));
            visual_width += global_pad;
        }

        line_str.push_str(&" ".repeat(row.indent as usize));
        visual_width += row.indent as usize;

        let mut bst = base_style(row.line_type, config, theme);
        if let Some(c) = row.override_color {
            bst.fg = Some(c);
        }

        let mut display = strip_sigils(&row.raw_text, row.line_type)
            .trim_end()
            .to_string();

        if matches!(
            row.line_type,
            LineType::SceneHeading | LineType::Transition | LineType::Shot
        ) {
            display = display.to_uppercase_1to1();
        } else if matches!(
            row.line_type,
            LineType::Character | LineType::DualDialogueCharacter
        ) {
            if let Some(idx) = display.find('(') {
                let name = display[..idx].to_uppercase_1to1();
                let ext = &display[idx..];
                display = format!("{}{}", name, ext);
            } else {
                display = display.to_uppercase_1to1();
            }
        }

        let empty_logical_line = String::new();
        let full_logical_line = lines.get(row.line_idx).unwrap_or(&empty_logical_line);
        let mut meta_key_end = 0;

        if (row.line_type == LineType::MetadataKey || row.line_type == LineType::MetadataTitle)
            && let Some(idx) = full_logical_line.find(':')
        {
            meta_key_end = full_logical_line[..=idx].chars().count() + 1;
        }

        let reveal_markup =
            !config.hide_markup || row.raw_text.contains("/*") || row.raw_text.contains("*/");
        let skip_md = row.line_type == LineType::Boneyard;

        let spans = render_inline(
            &display,
            bst,
            &row.fmt,
            RenderConfig {
                reveal_markup,
                skip_markdown: skip_md,
                exclude_comments: true,
                char_offset: row.char_start,
                meta_key_end,
                no_color: config.no_color || !with_ansi,
                no_formatting: config.no_formatting || !with_ansi,
                is_active: false,
            },
            &empty_highlights,
            &empty_highlights,
        );

        for span in spans {
            visual_width += UnicodeWidthStr::width(span.content.as_ref());
            if with_ansi {
                line_str.push_str(&style_to_ansi(span.style, span.content.as_ref()));
            } else {
                line_str.push_str(span.content.as_ref());
            }
        }

        let right_text = if mirror_scenes {
            row.scene_num.clone()
        } else {
            row.page_num.map(|pnum| format!("{}.", pnum))
        };

        if let Some(r_str) = right_text {
            let target_pos = global_pad + PAGE_WIDTH as usize + gap_size;
            if target_pos > visual_width {
                line_str.push_str(&" ".repeat(target_pos - visual_width));
            } else {
                line_str.push_str(&" ".repeat(gap_size));
            }

            if with_ansi {
                line_str.push_str(&format!("\x1b[90m{}\x1b[0m", r_str));
            } else {
                line_str.push_str(&r_str);
            }
        }

        output.push_str(&line_str);
        output.push('\n');
    }

    output
}

#[cfg(test)]
mod export_tests {
    use super::*;
    use crate::config::Config;
    use crate::layout::build_layout;
    use crate::parser::Parser;

    #[test]
    fn test_export_force_ascii_page_break() {
        use crate::types::LineType;

        let config = Config {
            force_ascii: true,
            ..Default::default()
        };

        let lines = vec!["===".to_string()];
        let types = vec![LineType::PageBreak];

        let theme = Theme::default();
        let layout = build_layout(&lines, &types, usize::MAX, &config, &theme, &mut Vec::new());

        let exported = export_document(&layout, &lines, &config, &theme, false);

        let expected_line = "-".repeat(crate::types::PAGE_WIDTH as usize);
        let unexpected_line = "─".repeat(crate::types::PAGE_WIDTH as usize);

        assert!(
            exported.contains(&expected_line),
            "Exported document should contain ASCII dashes"
        );
        assert!(
            !exported.contains(&unexpected_line),
            "Exported document should NOT contain Unicode box drawing characters"
        );
    }

    #[test]
    fn test_export_ansi_colors_and_empty_style() {
        use crate::formatting::LineFormatting;
        use crate::layout::VisualRow;
        use ratatui::style::Color;
        use std::rc::Rc;

        let layout_empty = vec![VisualRow {
            line_idx: 0,
            char_start: 0,
            char_end: 0,
            raw_text: "".to_string(),
            line_type: LineType::Action,
            indent: 0,
            is_active: false,
            scene_num: None,
            page_num: None,
            override_color: None,
            fmt: Rc::new(LineFormatting::default()),
            is_phantom: false,
        }];
        let theme = Theme::default();
        let config = Config::default();
        let exported = export_document(&layout_empty, vec!["".to_string()].as_slice(), &config, &theme, true);
        assert_eq!(exported, "\n");

        let colors = vec![
            Color::Black,
            Color::Red,
            Color::Green,
            Color::Yellow,
            Color::Blue,
            Color::Magenta,
            Color::Cyan,
            Color::Rgb(10, 20, 30),
        ];

        for color in colors {
            let layout = vec![VisualRow {
                line_idx: 0,
                char_start: 0,
                char_end: 4,
                raw_text: "Test".to_string(),
                line_type: LineType::Action,
                indent: 0,
                is_active: false,
                scene_num: None,
                page_num: None,
                override_color: Some(color),
                fmt: Rc::new(LineFormatting::default()),
                is_phantom: false,
            }];
            let out = export_document(&layout, vec!["Test".to_string()].as_slice(), &config, &theme, true);
            assert!(out.contains("\x1b[3"));
        }
    }

    #[test]
    fn test_export_edge_cases() {
        let mut config = Config::default();
        config.mirror_scene_numbers = crate::config::MirrorOption::Off;
        let lines = vec![
            "INT. ROOM".to_string(),
            "CHAR (V.O.)".to_string(),
            "A very long line indeed".to_string(),
        ];
        let types = vec![
            LineType::SceneHeading,
            LineType::Character,
            LineType::Action,
        ];

        let theme = Theme::default();
        let mut layout = crate::layout::build_layout(&lines, &types, usize::MAX, &config, &theme, &mut Vec::new());
        layout[0].scene_num = Some("999999".to_string());
        
        let exported = export_document(&layout, &lines, &config, &theme, false);

        assert!(exported.contains("999999 INT. ROOM"));
        assert!(exported.contains("CHAR (V.O.)"));
    }

    #[test]
    fn test_export_mirrors_scene_numbers() {
        use crate::config::{Config, MirrorOption};
        use crate::types::LineType;

        let config = Config {
            mirror_scene_numbers: MirrorOption::Always,
            ..Default::default()
        };

        let lines = vec!["INT. ROOM - DAY".to_string()];
        let types = vec![LineType::SceneHeading];

        let theme = Theme::default();
        let mut layout = crate::layout::build_layout(&lines, &types, usize::MAX, &config, &theme, &mut Vec::new());

        layout[0].scene_num = Some("42".to_string());
        layout[0].page_num = Some(69);

        let exported = export_document(&layout, &lines, &config, &theme, false);

        assert!(
            exported.contains("42"),
            "Mirrored scene number '42' should be present in export"
        );
        assert!(
            !exported.contains("69."),
            "Page number '69.' should be hidden when mirror_scene_numbers is active"
        );
    }

    #[test]
    fn test_export_integration() {
        let tutorial_text = r#"Title: Fount Tutorial
Credit: Written by
Author: René Coignard
Draft date: Version 0.2.17
Contact:
contact@renecoignard.com

INT. FLAT IN WOLFEN-NORD - DAY

RENÉ sits at his desk, typing.

RENÉ
(turning round)
Oh, hello there. It seems you've found my terminal Rust port of Beat. Sit back and I'll show you how everything works.

I sometimes write screenplays on my Gentoo laptop, and doing it in plain nano isn't terribly comfortable (I work entirely in the terminal there). So I decided to put this port of Beat together. I used Beat's source code as a reference when writing Fount, so things work more or less the same way.

As you may have already noticed, the navigation is rather reminiscent of nano, because I did look at its source code and took inspiration, for the sake of authenticity. I'm rather fond of it, and I hope you will be too. Not quite as nerdy as vim, but honestly, I'm an average nano enjoyer and I'm not ashamed of it.

Anyway, let's get into it.

EXT. NORDPARK - DAY

As I mentioned, things work much the same as in Beat. If you start a line with **int.** or **ext.**, Fount will automatically turn it into a scene heading. You can also use tab: on an empty line, it will first turn it into a character cue, then a scene heading, and then a transition. If you simply start typing IN CAPS ON AN EMPTY LINE, LIKE SO, the text will automatically become a character cue.

You can also use notes:

/* Two sailors are walking along the deck, when one turns to the other and says: */

SAILOR
I'm not a sailor, actually.

Fount automatically inserts two blank lines after certain elements, just as Beat does, though this can be adjusted in the configuration file. There's a sample config in the repository; do make use of it. Bonus: try enabling typewriter mode and see what happens.

To create a transition, simply write in capitals and end with a colon, like so:

CUT TO:

That alone is quite enough to write a proper screenplay. But there's more! For instance, we also have these:

/*

A multi-line comment.

For very, very, very long notes.

*/

[[Comments can look like this as well. They don't differ much from other comment types, but for compatibility with Beat, all the same comment types are supported.]]

#This is a new section

=And this is a synopsis.

INT. EDEKA - ABEND

Unlike Beat, there's no full render or PDF export here, but you can always save your screenplay and open it in Beat to do that. In Beat, synopses wouldn't appear in the rendered script, nor would comments. Which is why they share the same colour here, incidentally.

As you may have noticed, there's support for **bold text**, *italics*, and even _underlined text_. When your cursor isn't on a line containing these markers, they'll be hidden from view. Move onto the line, and you'll see all the asterisks and underscores that produce the formatting.

Centred text is supported as well, and works like this:

>Centred text<

You can also force transitions:

>AN ABRUPT TRANSITION TO THE NEXT SCENE:

EXT. WOLFEN(BITTERFELD) RAILWAY STATION - MORNING

Lyrics are supported too, using a tilde at the start of the line:

~Meine Damen, meine Herrn, danke
~Dass Sie mit uns reisen
~Zu abgefahrenen Preisen
~Auf abgefahrenen Gleisen
~Für Ihre Leidensfähigkeit, danken wir spontan
~Sänk ju for träweling wis Deutsche Bahn

That's Wise Guys. Onwards.

EXT. LEIPZIG HBF - MORNING

Well, do have a go on it, write something from scratch, or edit this screenplay. You might even turn up a bug or two; if so, please do let me know :-) Everything seemed to behave itself while I was putting this tutorial together, and I hope it all runs just as smoothly for you. I hope you enjoy working in Fount.

[[marker Speaking of which, I named the application after a certain Charlotte I once knew, who wrote quite wonderful screenplays.]]
[[marker blue The colour of these comment markers can be changed, as you can see.]]

You can find more information about the Fountain markup language at https://www.fountain.io/

And Beat itself, of course: https://www.beat-app.fi/

> FADE OUT"#;

        let lines: Vec<String> = tutorial_text.lines().map(|s| s.to_string()).collect();
        let mut config = Config::default();
        config.show_page_numbers = true;
        config.show_scene_numbers = true;
        config.mirror_scene_numbers = crate::config::MirrorOption::Off;

        let theme = Theme::default();
        let types = Parser::parse(&lines);
        let layout = build_layout(&lines, &types, usize::MAX, &config, &theme, &mut Vec::new());

        let plain_output = export_document(&layout, &lines, &config, &theme, false);
        let ansi_output = export_document(&layout, &lines, &config, &theme, true);

        let plain_lines: Vec<&str> = plain_output.lines().collect();
        let ansi_lines: Vec<&str> = ansi_output.lines().collect();

        let idx_title = plain_lines
            .iter()
            .position(|l| l.trim() == "Title: Fount Tutorial")
            .unwrap();
        let idx_scene = plain_lines
            .iter()
            .position(|l| l.contains("INT. FLAT IN WOLFEN-NORD - DAY"))
            .unwrap();
        let idx_char = plain_lines.iter().position(|l| l.trim() == "RENÉ").unwrap();
        let idx_paren = plain_lines
            .iter()
            .position(|l| l.trim() == "(turning round)")
            .unwrap();
        let idx_dial = plain_lines
            .iter()
            .position(|l| l.trim().starts_with("Oh, hello there."))
            .unwrap();
        let idx_cut = plain_lines
            .iter()
            .position(|l| l.trim() == "CUT TO:")
            .unwrap();
        let idx_centered = plain_lines
            .iter()
            .position(|l| l.trim() == "Centred text")
            .unwrap();
        let idx_markdown = plain_lines
            .iter()
            .position(|l| {
                l.trim()
                    .starts_with("As you may have noticed, there's support for bold text,")
            })
            .unwrap();
        let idx_lyric = plain_lines
            .iter()
            .position(|l| l.trim() == "Meine Damen, meine Herrn, danke")
            .unwrap();

        assert_eq!(
            plain_lines[idx_title],
            format!("{}Title: Fount Tutorial", " ".repeat(22))
        );
        assert_eq!(
            plain_lines[idx_scene],
            "     1      INT. FLAT IN WOLFEN-NORD - DAY                                    1."
        );
        assert_eq!(plain_lines[idx_char], format!("{}RENÉ", " ".repeat(32)));
        assert_eq!(
            plain_lines[idx_paren],
            format!("{}(turning round)", " ".repeat(28))
        );
        assert_eq!(
            plain_lines[idx_dial],
            format!("{}Oh, hello there. It seems you've", " ".repeat(23))
        );
        assert_eq!(plain_lines[idx_cut], format!("{}CUT TO:", " ".repeat(65)));
        assert_eq!(
            plain_lines[idx_centered],
            format!("{}Centred text", " ".repeat(36))
        );
        assert_eq!(
            plain_lines[idx_markdown],
            format!(
                "{}As you may have noticed, there's support for bold text,",
                " ".repeat(12)
            )
        );
        assert_eq!(
            plain_lines[idx_lyric],
            format!("{}Meine Damen, meine Herrn, danke", " ".repeat(26))
        );

        assert_eq!(
            ansi_lines[idx_scene],
            "     \x1b[90m1\x1b[0m      \x1b[1mINT. FLAT IN WOLFEN-NORD - DAY\x1b[0m                                    \x1b[90m1.\x1b[0m"
        );

        assert_eq!(
            ansi_lines[idx_markdown],
            format!(
                "{}As you may have noticed, there's support for \x1b[1mbold text\x1b[0m,",
                " ".repeat(12)
            )
        );

        assert_eq!(
            ansi_lines[idx_lyric],
            format!(
                "{}\x1b[3mMeine Damen, meine Herrn, danke\x1b[0m",
                " ".repeat(26)
            )
        );
    }
}
