use krilla::text::Font;

pub const FONT_SIZE: usize = 12;
pub const FONT_WIDTH: f32 = 7.2;

pub struct FontFamily {
    pub regular: Font,
    pub bold: Font,
    pub italic: Font,
    pub bold_italic: Font,
    pub sans_regular: Font,
    pub sans_bold: Font,
    pub sans_italic: Font,
    pub sans_bold_italic: Font,
}

pub struct PaperSize {
    pub x: usize,
    pub y: usize,
}

pub const A4: PaperSize = PaperSize { x: 595, y: 842 };
pub const LETTER: PaperSize = PaperSize { x: 612, y: 792 };

impl Default for PaperSize {
    fn default() -> Self {
        A4
    }
}

impl PaperSize {
    pub fn top_margin(&self) -> usize {
        72
    }

    pub fn bottom_margin(&self) -> usize {
        72
    }

    pub fn page_left_margin(&self) -> f32 {
        108.0
    }

    pub fn page_right_margin(&self) -> f32 {
        self.x as f32 - 540.0
    }
}

pub struct Margin {
    pub left: f32,
    pub right: f32,
}

pub struct DialogueMargins {
    pub character: Margin,
    pub parenthetical: Margin,
    pub line: Margin,
}

pub struct DualDialogueMargins {
    pub left: DialogueMargins,
    pub right: DialogueMargins,
}

pub struct Margins {
    pub heading: Margin,
    pub action: Margin,
    pub dialogue: DialogueMargins,
    pub dual_dialogue: DualDialogueMargins,
    pub lyrics: Margin,
    pub transition: Margin,
    pub centered: Margin,
    pub synopsis: Margin,
    pub page_number: Margin,
}

pub fn get_margins(size: &PaperSize) -> Margins {
    let page_left = size.page_left_margin();
    let page_right = size.page_right_margin();
    let page_w = size.x as f32;
    let half_page = page_w / 2.0;

    Margins {
        heading: Margin {
            left: page_left,
            right: page_right,
        },
        action: Margin {
            left: page_left,
            right: page_right,
        },
        dialogue: DialogueMargins {
            character: Margin {
                left: 266.4,
                right: page_w - 410.4,
            },
            parenthetical: Margin {
                left: 223.2,
                right: page_w - 396.0,
            },
            line: Margin {
                left: 180.0,
                right: page_w - 432.0,
            },
        },
        dual_dialogue: DualDialogueMargins {
            left: DialogueMargins {
                character: Margin {
                    left: 198.0,
                    right: 288.0,
                },
                parenthetical: Margin {
                    left: 162.0,
                    right: 324.0,
                },
                line: Margin {
                    left: 144.0,
                    right: 288.0,
                },
            },
            right: DialogueMargins {
                character: Margin {
                    left: half_page + 90.0,
                    right: page_right,
                },
                parenthetical: Margin {
                    left: half_page + 54.0,
                    right: page_right + 18.0,
                },
                line: Margin {
                    left: half_page + 36.0,
                    right: page_right,
                },
            },
        },
        lyrics: Margin {
            left: 144.0,
            right: page_w - 432.0,
        },
        transition: Margin {
            left: page_left,
            right: page_right,
        },
        centered: Margin {
            left: 144.0,
            right: page_w - 432.0,
        },
        synopsis: Margin {
            left: page_left,
            right: page_right,
        },
        page_number: Margin {
            left: page_left,
            right: page_right,
        },
    }
}

pub struct LayoutInfo<'a> {
    pub size: &'a PaperSize,
    pub fonts: &'a FontFamily,
    pub export_font: &'a str,
    pub revised_lines: &'a [bool],
    pub margins: Margins,
}
