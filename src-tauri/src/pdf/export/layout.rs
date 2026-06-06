use krilla::text::Font;

pub const FONT_SIZE: f32 = 12.0;
pub const LINE_HEIGHT: f32 = 12.0;

pub struct PaperSize {
    pub x: f32,
    pub y: f32,
}

pub const A4: PaperSize = PaperSize {
    x: 595.0,
    y: 842.0,
};
pub const LETTER: PaperSize = PaperSize {
    x: 612.0,
    y: 792.0,
};

impl Default for PaperSize {
    fn default() -> Self {
        A4
    }
}

impl PaperSize {
    pub fn top_margin(&self) -> f32 {
        72.0
    }

    pub fn bottom_margin(&self) -> f32 {
        72.0
    }

    pub fn page_left_margin(&self) -> f32 {
        108.0
    }

    pub fn page_right_margin(&self) -> f32 {
        self.x - 540.0
    }

    pub fn printable_height(&self) -> f32 {
        self.y - self.top_margin() - self.bottom_margin()
    }
}

pub struct Margin {
    pub left: f32,
    pub right: f32,
}

impl Margin {
    pub fn content_width(&self, page: &PaperSize) -> f32 {
        page.x - self.left - self.right
    }
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
    let page_w = size.x;
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

pub struct CourierFonts {
    pub regular: Font,
    pub bold: Font,
    pub italic: Font,
    pub bold_italic: Font,
    pub sans_regular: Font,
    pub sans_bold: Font,
    pub sans_italic: Font,
    pub sans_bold_italic: Font,
}

pub struct NotoFonts {
    pub tamil_regular: Font,
    pub tamil_bold: Font,
    pub devanagari_regular: Font,
    pub devanagari_bold: Font,
    pub telugu_regular: Font,
    pub telugu_bold: Font,
    pub malayalam_regular: Font,
    pub malayalam_bold: Font,
    pub kannada_regular: Font,
    pub kannada_bold: Font,
    pub bengali_regular: Font,
    pub bengali_bold: Font,
    pub gujarati_regular: Font,
    pub gujarati_bold: Font,
    pub gurmukhi_regular: Font,
    pub gurmukhi_bold: Font,
}

pub struct AllFonts {
    pub courier: CourierFonts,
    pub noto: NotoFonts,
}

pub struct LayoutInfo<'a> {
    pub size: &'a PaperSize,
    pub fonts: &'a AllFonts,
    pub export_font: &'a str,
    pub revised_lines: &'a [bool],
    pub margins: Margins,
}
