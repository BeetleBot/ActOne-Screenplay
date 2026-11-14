use actone_lib::pdf::{self, Exporter, PdfExporter};
fn main() {
    let directory = std::path::PathBuf::from(std::env::args_os().nth(1).expect("output directory"));
    std::fs::create_dir_all(&directory).unwrap();
    let source = ".SCENE ONE\n\nBOB\nLeft dialogue.\n\nALICE ^\nRight dialogue.\n";
    for (name, paper, watermark) in [
        ("letter", pdf::LETTER, false),
        ("a4", pdf::A4, false),
        ("watermark", pdf::LETTER, true),
    ] {
        let exporter = PdfExporter {
            paper_size: paper,
            title_page: false,
            watermark_center_enabled: watermark,
            watermark_center_type: "text".into(),
            watermark_center_text: "CONFIDENTIAL".into(),
            watermark_center_opacity: 0.35,
            ..Default::default()
        };
        let mut bytes = Vec::new();
        exporter.export(&pdf::parse(source), &mut bytes).unwrap();
        std::fs::write(directory.join(format!("{name}.pdf")), bytes).unwrap();
    }
    orphan_fixtures(&directory);
    boundary_fixtures(&directory);
}

fn orphan_fixtures(directory: &std::path::Path) {
    for (paper_name, is_a4) in [("letter", false), ("a4", true)] {
        let fill = if is_a4 { 27 } else { 25 };
        let filler = |count: usize| {
            (1..=count)
                .map(|i| format!("Filler paragraph {i}.\n\n"))
                .collect::<String>()
        };
        let rows = |prefix: &str, count: usize| {
            (1..=count)
                .map(|i| format!("{prefix} row {i}.\n"))
                .collect::<String>()
        };
        let cases = [
            (
                "heading-three",
                format!(
                    "{}INT. ORPHAN TEST - DAY\n\n{}",
                    filler(fill),
                    rows("Action", 3)
                ),
            ),
            (
                "heading-single",
                format!(
                    "{}INT. ORPHAN TEST - DAY\n\nAction row 1.\n",
                    filler(fill + 1)
                ),
            ),
            (
                "heading-cue",
                format!(
                    "{}INT. ORPHAN TEST - DAY\n\nBOB\n(quietly)\nSpeech row 1.\n",
                    filler(fill)
                ),
            ),
            (
                "heading-chain",
                format!(
                    "{}INT. ORPHAN TEST - DAY\n\n!!CLOSE ON THE DOOR\n\n{}",
                    filler(fill - 1),
                    rows("Action", 3)
                ),
            ),
            (
                "shot-three",
                format!(
                    "{}!!CLOSE ON THE DOOR\n\n{}",
                    filler(fill),
                    rows("Action", 3)
                ),
            ),
            (
                "section-three",
                format!("{}# A SECTION\n\n{}", filler(fill), rows("Action", 3)),
            ),
            (
                "parenthetical",
                format!(
                    "{}BOB\n{}(quietly)\n{}",
                    filler(fill - 1),
                    rows("Before", 3),
                    rows("After", 3)
                ),
            ),
            (
                "dialogue-sentence",
                format!(
                    "{}BOB\nSpeech row 1\nSpeech row 2\nSpeech row 3.\nSpeech row 4\nSpeech row 5\nSpeech row 6.\n",
                    filler(fill - 1)
                ),
            ),
            (
                "action-split",
                format!("{}{}", filler(fill), rows("Action", 5)),
            ),
            (
                "dual-short",
                format!(
                    "{}BOB\n{}\nALICE ^\n{}",
                    filler(fill - 1),
                    rows("Left", 6),
                    rows("Right", 6)
                ),
            ),
            (
                "dual-long",
                format!(
                    "{}BOB\n{}\nALICE ^\n{}",
                    filler(fill - 1),
                    rows("Left", 70),
                    rows("Right", 65)
                ),
            ),
            (
                "dual-unequal",
                format!("BOB\n{}\nALICE ^\n{}", rows("Left", 70), rows("Right", 2)),
            ),
            (
                "long-sentence",
                format!(
                    "INT. ORPHAN TEST - DAY\n\nBOB\n{}",
                    "words without punctuation ".repeat(450)
                ),
            ),
            (
                "manual-break",
                "INT. ORPHAN TEST - DAY\n\n===\n\nAction row 1.\n".into(),
            ),
            (
                "hidden-outline",
                format!(
                    "{}INT. ORPHAN TEST - DAY\n\n# Hidden section\n= Hidden synopsis\n\n{}",
                    filler(fill),
                    rows("Action", 3)
                ),
            ),
            (
                "styled-heading",
                format!(
                    "{}INT. ORPHAN TEST - DAY\n\n{}",
                    filler(fill),
                    rows("Action", 3)
                ),
            ),
        ];
        for (name, source) in cases {
            let mut exporter = PdfExporter {
                paper_size: if is_a4 { pdf::A4 } else { pdf::LETTER },
                title_page: false,
                sections: name == "section-three",
                ..Default::default()
            };
            if name == "styled-heading" {
                exporter.element_formats.action.bold = true;
                exporter.element_formats.action.italic = true;
                exporter.export_font = "courier_prime_sans".into();
            }
            let mut bytes = Vec::new();
            exporter
                .export(&pdf::parse(&source), &mut bytes)
                .unwrap_or_else(|error| panic!("{paper_name}-{name}: {error}"));
            std::fs::write(directory.join(format!("{paper_name}-{name}.pdf")), bytes).unwrap();
        }
    }
}

fn boundary_fixtures(directory: &std::path::Path) {
    let mut manifest = Vec::new();
    for (paper_name, is_a4) in [("letter", false), ("a4", true)] {
        for (font_name, font) in [("courier", "courier_prime"), ("sans", "courier_prime_sans")] {
            for offset in 0..8 {
                let fill = if is_a4 { 23 + offset } else { 19 + offset };
                let filler = "Filler paragraph.\n\n".repeat(fill);
                let rows = |prefix: &str, count: usize| {
                    (1..=count)
                        .map(|i| format!("line {prefix}{i:03}.\n"))
                        .collect::<String>()
                };
                let heading = "INT. BOUNDARY - DAY\n\n";
                let cases = [
                    (
                        "action-one",
                        format!("{heading}{}", rows("A", 1)),
                        "A",
                        1,
                        0,
                    ),
                    (
                        "action-three",
                        format!("{heading}{}", rows("A", 3)),
                        "A",
                        3,
                        0,
                    ),
                    (
                        "action-five",
                        format!("{heading}{}", rows("A", 5)),
                        "A",
                        5,
                        0,
                    ),
                    (
                        "cue",
                        format!("{heading}BOB\n(whispering)\n{}", rows("D", 1)),
                        "D",
                        1,
                        0,
                    ),
                    (
                        "speech",
                        format!("{heading}BOB\n{}", rows("D", 9)),
                        "D",
                        9,
                        0,
                    ),
                    (
                        "parenthetical",
                        format!(
                            "{heading}BOB\n{}(whispering)\n{}",
                            rows("D", 4),
                            rows("E", 5)
                        ),
                        "DE",
                        4,
                        5,
                    ),
                    (
                        "dual",
                        format!("{heading}BOB\n{}\nALICE ^\n{}", rows("L", 9), rows("R", 7)),
                        "LR",
                        9,
                        7,
                    ),
                    (
                        "dual-long",
                        format!(
                            "{heading}BOB\n{}\nALICE ^\n{}",
                            rows("L", 72),
                            rows("R", 61)
                        ),
                        "LR",
                        72,
                        61,
                    ),
                    (
                        "transition-action",
                        format!("{heading}{}\n> CUT TO:\n", rows("A", 70)),
                        "A",
                        70,
                        0,
                    ),
                    (
                        "transition-speech",
                        format!("{heading}BOB\n{}\n> CUT TO:\n", rows("D", 70)),
                        "D",
                        70,
                        0,
                    ),
                ];
                for (kind, body, prefixes, first, second) in cases {
                    let name = format!("boundary-{paper_name}-{font_name}-{offset}-{kind}");
                    let mut exporter = PdfExporter {
                        paper_size: if is_a4 { pdf::A4 } else { pdf::LETTER },
                        export_font: font.into(),
                        title_page: false,
                        ..Default::default()
                    };
                    // Exercise styles that affect measured wrapping and glyph metrics.
                    exporter.element_formats.scene_heading.italic = offset % 2 == 1;
                    exporter.element_formats.character.bold = offset % 3 == 0;
                    let parsed = pdf::parse(&format!("{filler}{body}"));
                    let mut bytes = Vec::new();
                    exporter
                        .export(&parsed, &mut bytes)
                        .unwrap_or_else(|error| panic!("{name}: {error}"));
                    std::fs::write(directory.join(format!("{name}.pdf")), bytes).unwrap();
                    manifest.push(serde_json::json!({ "name": name, "kind": kind, "prefixes": prefixes, "first": first, "second": second }));
                }
            }
        }
    }
    std::fs::write(
        directory.join("boundary-cases.json"),
        serde_json::to_vec(&manifest).unwrap(),
    )
    .unwrap();
}
