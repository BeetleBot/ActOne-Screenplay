//! Prose export presets. Keep IDs in sync with src/constants/proseExportStyles.ts.
#[derive(Debug, Clone, Copy)]
pub struct ProseStyle {
    pub font: &'static str,
    pub body_size: f32,
    pub margin: f32,
    pub line_gap: f32,
    pub heading_sizes: [f32; 6],
    pub table_header_gray: u8,
    pub table_padding: f32,
    pub center_title: bool,
    pub manuscript: bool,
    pub paragraph_space: f32,
    pub block_space: f32,
    pub heading_before: [f32; 6],
    pub heading_after: [f32; 6],
    pub indent_spaces: usize,
}

pub fn prose_style(id: &str) -> ProseStyle {
    let mut style = ProseStyle {
        font: "Literata",
        body_size: 11.5,
        margin: 72.0,
        line_gap: 4.5,
        heading_sizes: [22.0, 16.0, 13.0, 11.5, 11.0, 10.5],
        table_header_gray: 245,
        table_padding: 4.0,
        center_title: true,
        manuscript: false,
        paragraph_space: 6.0,
        block_space: 10.0,
        heading_before: [18.0, 14.0, 12.0, 10.0, 8.0, 6.0],
        heading_after: [9.0, 7.0, 5.0, 4.0, 3.0, 3.0],
        indent_spaces: 0,
    };
    match id {
        "classic" => {}
        "manuscript" => {
            style.font = "courier_prime";
            style.manuscript = true;
            style.paragraph_space = 0.0;
            style.block_space = 12.0;
            style.heading_before = [12.0; 6];
            style.heading_after = [12.0, 6.0, 6.0, 6.0, 6.0, 6.0];
            style.indent_spaces = 5;
            style.body_size = 12.0;
            style.line_gap = 12.0;
            style.heading_sizes = [12.0; 6];
            style.table_header_gray = 255;
            style.center_title = false;
        }
        "treatment" => {
            style.font = "Source Serif 4";
            style.paragraph_space = 8.0;
            style.block_space = 12.0;
            style.heading_before = [20.0, 16.0, 14.0, 12.0, 10.0, 8.0];
            style.heading_after = [10.0, 8.0, 6.0, 5.0, 4.0, 4.0];
            style.body_size = 12.0;
            style.line_gap = 4.0;
            style.heading_sizes = [24.0, 17.0, 14.0, 12.0, 11.0, 10.5];
            style.table_padding = 6.0;
            style.center_title = false;
        }
        "modern" => {
            style.font = "Inter";
            style.paragraph_space = 6.0;
            style.block_space = 12.0;
            style.heading_before = [24.0, 18.0, 14.0, 12.0, 10.0, 8.0];
            style.heading_after = [12.0, 9.0, 7.0, 5.0, 4.0, 4.0];
            style.body_size = 11.0;
            style.margin = 60.0;
            style.line_gap = 3.5;
            style.heading_sizes = [32.0, 22.0, 16.0, 13.0, 11.5, 10.5];
            style.table_header_gray = 235;
            style.table_padding = 5.0;
            style.center_title = false;
        }
        "literary" => {
            style.font = "EB Garamond";
            style.paragraph_space = 0.0;
            style.block_space = 12.0;
            style.heading_before = [22.0, 16.0, 14.0, 12.0, 10.0, 8.0];
            style.heading_after = [12.0, 9.0, 7.0, 5.0, 4.0, 4.0];
            style.indent_spaces = 2;
            style.body_size = 12.5;
            style.margin = 84.0;
            style.line_gap = 5.0;
            style.heading_sizes = [25.0, 17.0, 14.0, 12.5, 11.5, 11.0];
            style.table_header_gray = 255;
        }
        _ => {}
    }
    style
}

impl ProseStyle {
    pub fn block_gap(self) -> f32 {
        self.block_space
    }
    pub fn paragraph_gap(self) -> f32 {
        self.paragraph_space
    }
}
