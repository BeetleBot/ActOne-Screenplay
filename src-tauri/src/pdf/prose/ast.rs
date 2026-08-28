//! Markdown → block tree parser used by the prose PDF exporter.
//!
//! Parses Markdown (CommonMark + tables, strikethrough, task lists and
//! footnotes) into an owned block tree. Inline styling is converted directly
//! into [`RichString`] elements so the exporter can render it with the shared
//! krilla pipeline.

use pulldown_cmark::{
    Alignment, CodeBlockKind, Event, Options, Parser, Tag, TagEnd,
};

use crate::pdf::rich_string::{Element, RichString};

/// A parsed Markdown document.
#[derive(Debug, Clone, PartialEq)]
pub struct ProseDoc {
    pub blocks: Vec<Block>,
}

/// A block-level element in a Markdown document.
#[derive(Debug, Clone, PartialEq)]
pub enum Block {
    Heading { level: u8, content: RichString },
    Paragraph(RichString),
    List { ordered: bool, start: u64, items: Vec<ListItem> },
    Blockquote(Vec<Block>),
    CodeBlock { lang: String, text: String },
    Table { alignments: Vec<Align>, header: Vec<RichString>, rows: Vec<Vec<RichString>> },
    HorizontalRule,
    RawHtml(String),
    FootnoteDefinition { label: String, blocks: Vec<Block> },
}

/// A list item, with optional task-list checkbox state.
#[derive(Debug, Clone, PartialEq)]
pub struct ListItem {
    pub checked: Option<bool>,
    pub blocks: Vec<Block>,
}

/// Table column alignment.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Align {
    None,
    Left,
    Center,
    Right,
}

/// Inline style state while walking a paragraph.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
struct Style {
    bold: bool,
    italic: bool,
    underline: bool,
    strike: bool,
    mono: bool,
    highlight: bool,
}

/// Parses Markdown source into a [`ProseDoc`].
pub fn parse(src: &str) -> ProseDoc {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_FOOTNOTES);

    let events: Vec<(Event, std::ops::Range<usize>)> =
        Parser::new_ext(src, options).into_offset_iter().collect();
    let mut index = 0;
    let blocks = parse_blocks(src, &events, &mut index);
    ProseDoc { blocks }
}

/// Parses a sequence of blocks until an `Event::End` or the end of input.
fn parse_blocks<'a>(
    src: &str,
    events: &[(Event<'a>, std::ops::Range<usize>)],
    index: &mut usize,
) -> Vec<Block> {
    let mut blocks = Vec::new();
    while *index < events.len() {
        match &events[*index].0 {
            Event::End(_) => break,
            Event::Start(tag) => match tag {
                Tag::Paragraph => {
                    *index += 1;
                    let rs = parse_inline(src, events, index, TagEnd::Paragraph);
                    if !rs.elements.is_empty() {
                        blocks.push(Block::Paragraph(rs));
                    }
                }
                Tag::Heading { level, .. } => {
                    let heading_level = *level;
                    *index += 1;
                    let rs = parse_inline(src, events, index, TagEnd::Heading(heading_level));
                    if !rs.elements.is_empty() {
                        blocks.push(Block::Heading { level: heading_level as u8, content: rs });
                    }
                }
                Tag::BlockQuote(_) => {
                    *index += 1;
                    let inner = parse_blocks(src, events, index);
                    if *index < events.len() {
                        *index += 1;
                    }
                    blocks.push(Block::Blockquote(inner));
                }
                Tag::List(start) => {
                    let ordered = start.is_some();
                    let start_num = start.unwrap_or(1);
                    *index += 1;
                    let mut items = Vec::new();
                    while *index < events.len() {
                        match &events[*index].0 {
                            Event::End(TagEnd::List(_)) => {
                                *index += 1;
                                break;
                            }
                            Event::Start(Tag::Item) => {
                                *index += 1;
                                let mut checked = None;
                                if matches!(events.get(*index).map(|e| &e.0), Some(Event::TaskListMarker(_))) {
                                    if let Some((Event::TaskListMarker(c), _)) = events.get(*index) {
                                        checked = Some(*c);
                                    }
                                    *index += 1;
                                }
                                let item_blocks = parse_blocks(src, events, index);
                                if *index < events.len() {
                                    *index += 1;
                                }
                                items.push(ListItem { checked, blocks: item_blocks });
                            }
                            _ => *index += 1,
                        }
                    }
                    blocks.push(Block::List { ordered, start: start_num, items });
                }
                Tag::CodeBlock(kind) => {
                    let lang = match kind {
                        CodeBlockKind::Indented => String::new(),
                        CodeBlockKind::Fenced(lang) => lang.to_string(),
                    };
                    *index += 1;
                    let mut text = String::new();
                    while *index < events.len() {
                        match &events[*index].0 {
                            Event::End(TagEnd::CodeBlock) => {
                                *index += 1;
                                break;
                            }
                            Event::Text(t) => {
                                text.push_str(t);
                                *index += 1;
                            }
                            _ => *index += 1,
                        }
                    }
                    blocks.push(Block::CodeBlock { lang, text });
                }
                Tag::Table(alignments) => {
                    let aligns: Vec<Align> = alignments
                        .iter()
                        .map(|a| match a {
                            Alignment::None => Align::None,
                            Alignment::Left => Align::Left,
                            Alignment::Center => Align::Center,
                            Alignment::Right => Align::Right,
                        })
                        .collect();
                    *index += 1;
                    let mut header = Vec::new();
                    let mut rows = Vec::new();
                    while *index < events.len() {
                        match &events[*index].0 {
                            Event::End(TagEnd::Table) => {
                                *index += 1;
                                break;
                            }
                            Event::Start(Tag::TableHead) => {
                                *index += 1;
                                while *index < events.len() {
                                    match &events[*index].0 {
                                        Event::End(TagEnd::TableHead) => {
                                            *index += 1;
                                            break;
                                        }
                                        Event::Start(Tag::TableCell) => {
                                            *index += 1;
                                            header.push(parse_inline(src, events, index, TagEnd::TableCell));
                                        }
                                        _ => *index += 1,
                                    }
                                }
                            }
                            Event::Start(Tag::TableRow) => {
                                *index += 1;
                                rows.push(parse_table_row(src, events, index));
                            }
                            _ => *index += 1,
                        }
                    }
                    blocks.push(Block::Table { alignments: aligns, header, rows });
                }
                Tag::HtmlBlock => {
                    *index += 1;
                    let mut text = String::new();
                    while *index < events.len() {
                        match &events[*index].0 {
                            Event::End(TagEnd::HtmlBlock) => {
                                *index += 1;
                                break;
                            }
                            Event::Html(h) => {
                                text.push_str(h);
                                *index += 1;
                            }
                            Event::Text(t) => {
                                text.push_str(t);
                                *index += 1;
                            }
                            _ => *index += 1,
                        }
                    }
                    blocks.push(Block::RawHtml(text));
                }
                Tag::FootnoteDefinition(label) => {
                    let label = label.to_string();
                    *index += 1;
                    let inner = parse_blocks(src, events, index);
                    if *index < events.len() {
                        *index += 1;
                    }
                    blocks.push(Block::FootnoteDefinition { label, blocks: inner });
                }
                _ => *index += 1,
            },
            Event::Rule => {
                blocks.push(Block::HorizontalRule);
                *index += 1;
            }
            Event::Text(text) => {
                let mut rs = RichString::new();
                push_styled(&mut rs, text, Style::default(), None);
                if !rs.elements.is_empty() {
                    blocks.push(Block::Paragraph(rs));
                }
                *index += 1;
            }
            Event::Code(text) => {
                let mut rs = RichString::new();
                let style = Style {
                    mono: true,
                    ..Style::default()
                };
                push_styled(&mut rs, text, style, None);
                if !rs.elements.is_empty() {
                    blocks.push(Block::Paragraph(rs));
                }
                *index += 1;
            }
            _ => *index += 1,
        }
    }
    blocks
}

/// Parses a single table row into its cells.
fn parse_table_row<'a>(
    src: &str,
    events: &[(Event<'a>, std::ops::Range<usize>)],
    index: &mut usize,
) -> Vec<RichString> {
    let mut cells = Vec::new();
    while *index < events.len() {
        match &events[*index].0 {
            Event::End(TagEnd::TableRow) => {
                *index += 1;
                break;
            }
            Event::Start(Tag::TableCell) => {
                *index += 1;
                cells.push(parse_inline(src, events, index, TagEnd::TableCell));
            }
            _ => *index += 1,
        }
    }
    cells
}

/// Parses inline content until the given end tag.
fn parse_inline<'a>(
    src: &str,
    events: &[(Event<'a>, std::ops::Range<usize>)],
    index: &mut usize,
    stop: TagEnd,
) -> RichString {
    let mut current = RichString::new();
    let mut styles: Vec<Style> = vec![Style::default()];
    let mut links: Vec<String> = Vec::new();

    while *index < events.len() {
        let (event, range) = &events[*index];
        match event {
            Event::End(end) if *end == stop => {
                *index += 1;
                break;
            }
            Event::Start(Tag::Emphasis) => {
                let is_underscore = src.get(range.start..range.start + 1) == Some("_");
                let mut s = styles.last().copied().unwrap_or_default();
                if is_underscore {
                    s.underline = !s.underline;
                } else {
                    s.italic = !s.italic;
                }
                styles.push(s);
                *index += 1;
            }
            Event::End(TagEnd::Emphasis) => {
                if styles.len() > 1 {
                    styles.pop();
                }
                *index += 1;
            }
            Event::Start(Tag::Strong) => {
                let mut s = styles.last().copied().unwrap_or_default();
                s.bold = !s.bold;
                styles.push(s);
                *index += 1;
            }
            Event::End(TagEnd::Strong) => {
                if styles.len() > 1 {
                    styles.pop();
                }
                *index += 1;
            }
            Event::Start(Tag::Strikethrough) => {
                let mut s = styles.last().copied().unwrap_or_default();
                s.strike = !s.strike;
                styles.push(s);
                *index += 1;
            }
            Event::End(TagEnd::Strikethrough) => {
                if styles.len() > 1 {
                    styles.pop();
                }
                *index += 1;
            }
            Event::Start(Tag::Link { dest_url, .. }) => {
                let mut s = styles.last().copied().unwrap_or_default();
                s.underline = true;
                styles.push(s);
                links.push(dest_url.to_string());
                *index += 1;
            }
            Event::End(TagEnd::Link) => {
                if styles.len() > 1 {
                    styles.pop();
                }
                links.pop();
                *index += 1;
            }
            Event::Text(text) => {
                let text = text.to_string();
                let base = *styles.last().unwrap();
                let link = links.last().map(|s| s.as_str());
                if !text.contains("==") {
                    push_styled(&mut current, &text, base, link);
                } else {
                    let mut rest = text.as_str();
                    while let Some(start) = rest.find("==") {
                        let before = &rest[..start];
                        if !before.is_empty() {
                            push_styled(&mut current, before, base, link);
                        }
                        let after_open = &rest[start + 2..];
                        if let Some(end) = after_open.find("==") {
                            let inner = &after_open[..end];
                            if !inner.is_empty()
                                && !inner.contains('\n')
                                && !inner.starts_with(|c: char| c.is_whitespace())
                                && !inner.ends_with(|c: char| c.is_whitespace())
                            {
                                let mut hs = base;
                                hs.highlight = true;
                                push_styled(&mut current, inner, hs, link);
                            } else {
                                push_styled(&mut current, &rest[start..start + 2 + end + 2], base, link);
                            }
                            rest = &after_open[end + 2..];
                        } else {
                            push_styled(&mut current, &rest[start..], base, link);
                            rest = "";
                            break;
                        }
                    }
                    if !rest.is_empty() {
                        push_styled(&mut current, rest, base, link);
                    }
                }
                *index += 1;
            }
            Event::Code(text) => {
                let mut s = *styles.last().unwrap();
                s.mono = true;
                push_styled(
                    &mut current,
                    text,
                    s,
                    links.last().map(|s| s.as_str()),
                );
                *index += 1;
            }
            Event::SoftBreak => {
                push_styled(
                    &mut current,
                    "\n",
                    *styles.last().unwrap(),
                    links.last().map(|s| s.as_str()),
                );
                *index += 1;
            }
            Event::HardBreak => {
                push_styled(
                    &mut current,
                    "\n",
                    *styles.last().unwrap(),
                    links.last().map(|s| s.as_str()),
                );
                *index += 1;
            }
            Event::InlineHtml(html) => {
                let trimmed = html.trim();
                if trimmed.eq_ignore_ascii_case("<u>") || trimmed.eq_ignore_ascii_case("<ins>") {
                    let mut s = styles.last().copied().unwrap_or_default();
                    s.underline = true;
                    styles.push(s);
                    *index += 1;
                } else if trimmed.eq_ignore_ascii_case("</u>") || trimmed.eq_ignore_ascii_case("</ins>") {
                    if styles.len() > 1 {
                        styles.pop();
                    }
                    *index += 1;
                } else {
                    push_styled(
                        &mut current,
                        html,
                        *styles.last().unwrap(),
                        links.last().map(|s| s.as_str()),
                    );
                    *index += 1;
                }
            }
            Event::FootnoteReference(label) => {
                push_styled(
                    &mut current,
                    &format!("[{label}]"),
                    *styles.last().unwrap(),
                    links.last().map(|s| s.as_str()),
                );
                *index += 1;
            }
            _ => *index += 1,
        }
    }
    current
}

/// Pushes text with a style onto a [`RichString`], merging with the previous
/// element when the style matches.
fn push_styled(rs: &mut RichString, text: &str, style: Style, link: Option<&str>) {
    if text.is_empty() {
        return;
    }
    let mut el = Element::new(text.to_string());
    if style.bold {
        el.set_bold();
    }
    if style.italic {
        el.set_italic();
    }
    if style.underline {
        el.set_underline();
    }
    if style.strike {
        el.set_strike();
    }
    if style.mono {
        el.set_mono();
    }
    if style.highlight {
        el.set_highlight();
    }
    if let Some(url) = link {
        el.set_link(url.to_string());
    }
    if let Some(last) = rs.elements.last_mut()
        && last.attributes == el.attributes && last.link_url == el.link_url {
            last.text.push_str(&el.text);
            return;
        }
    rs.elements.push(el);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_heading_and_paragraph() {
        let doc = parse("# Title\n\nHello world.\n");
        assert_eq!(doc.blocks.len(), 2);
        assert_eq!(
            doc.blocks[0],
            Block::Heading {
                level: 1,
                content: RichString::from("Title")
            }
        );
        assert_eq!(doc.blocks[1], Block::Paragraph(RichString::from("Hello world.")));
    }

    #[test]
    fn parses_emphasis_bold_and_strike() {
        let doc = parse("Some *em* _under_ **strong** ~~gone~~ <u>html_under</u> text\n");
        let Block::Paragraph(rs) = &doc.blocks[0] else {
            panic!("expected paragraph");
        };
        let plain = rs.to_plain_string();
        assert_eq!(plain, "Some em under strong gone html_under text");
        assert!(rs.elements.iter().any(|e| e.is_italic()));
        assert!(rs.elements.iter().any(|e| e.is_underline()));
        assert!(rs.elements.iter().any(|e| e.is_bold()));
        assert!(rs.elements.iter().any(|e| e.is_strike()));
    }

    #[test]
    fn parses_inline_code_as_mono() {
        let doc = parse("Use `println!` here\n");
        let Block::Paragraph(rs) = &doc.blocks[0] else {
            panic!("expected paragraph");
        };
        assert!(rs.elements.iter().any(|e| e.is_mono()));
        assert_eq!(rs.to_plain_string(), "Use println! here");
    }

    #[test]
    fn link_is_underlined() {
        let doc = parse("[ActOne](https://actone.app)\n");
        let Block::Paragraph(rs) = &doc.blocks[0] else {
            panic!("expected paragraph");
        };
        assert_eq!(rs.to_plain_string(), "ActOne");
        assert!(rs.elements.iter().any(|e| e.is_underline()));
    }

    #[test]
    fn parses_ordered_and_unordered_lists() {
        let doc = parse("- one\n- two\n\n1. first\n2. second\n");
        assert!(matches!(doc.blocks[0], Block::List { ordered: false, .. }));
        assert!(matches!(doc.blocks[1], Block::List { ordered: true, .. }));
        let Block::List { ordered: false, items, .. } = &doc.blocks[0] else {
            panic!("expected unordered list");
        };
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].checked, None);
    }

    #[test]
    fn parses_task_lists() {
        let doc = parse("- [ ] todo\n- [x] done\n");
        let Block::List { items, .. } = &doc.blocks[0] else {
            panic!("expected list");
        };
        assert_eq!(items[0].checked, Some(false));
        assert_eq!(items[1].checked, Some(true));
    }

    #[test]
    fn parses_blockquote() {
        let doc = parse("> quoted text\n");
        assert!(matches!(doc.blocks[0], Block::Blockquote(_)));
        let Block::Blockquote(inner) = &doc.blocks[0] else {
            panic!("expected blockquote");
        };
        assert!(matches!(inner[0], Block::Paragraph(_)));
    }

    #[test]
    fn parses_code_block_with_language() {
        let doc = parse("```rust\nfn main() {}\n```\n");
        assert_eq!(
            doc.blocks[0],
            Block::CodeBlock {
                lang: "rust".to_string(),
                text: "fn main() {}\n".to_string()
            }
        );
    }

    #[test]
    fn parses_table() {
        let doc = parse("| A | B |\n| - | - |\n| 1 | 2 |\n");
        let Block::Table { header, rows, .. } = &doc.blocks[0] else {
            panic!("expected table");
        };
        assert_eq!(header.len(), 2);
        assert_eq!(header[0].to_plain_string(), "A");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0][1].to_plain_string(), "2");
    }

    #[test]
    fn parses_horizontal_rule() {
        let doc = parse("---\n");
        assert_eq!(doc.blocks[0], Block::HorizontalRule);
    }

    #[test]
    fn image_markdown_renders_alt_text() {
        let doc = parse("![alt text](images/cat.png)\n");
        assert_eq!(doc.blocks[0], Block::Paragraph(RichString::from("alt text")));
    }

    #[test]
    fn inline_image_renders_alt_text_inline() {
        let doc = parse("Before ![pic](a.png) after\n");
        let Block::Paragraph(rs) = &doc.blocks[0] else {
            panic!("expected paragraph");
        };
        assert_eq!(rs.to_plain_string(), "Before pic after");
    }

    #[test]
    fn parses_footnote_definition() {
        let doc = parse("[^1]: A note.\n");
        let Block::FootnoteDefinition { label, blocks } = &doc.blocks[0] else {
            panic!("expected footnote definition");
        };
        assert_eq!(label, "1");
        assert_eq!(blocks.len(), 1);
    }

    #[test]
    fn empty_document() {
        let doc = parse("");
        assert!(doc.blocks.is_empty());
    }
}
