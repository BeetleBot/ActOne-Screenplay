//! This module implements the [Screenplay] AST with all the components of a screenplay, to be
//! easily exported to any format.

use crate::pdf::rich_string::RichString;

/// A (very flat) abstract syntax tree consisting of the entirety of a screenplay and well as the
/// information for the title page of the screenplay.
///
/// Contains both a [`Option<TitlePage>`] and a [`Vec<Element>`], which are the screenplay components.
#[derive(Debug, PartialEq, Eq, Clone, Hash, Default)]
pub struct Screenplay {
    pub titlepage: Option<TitlePage>,
    pub elements: Vec<Span<Element>>,
}

impl Screenplay {
    /// Create a new [Screenplay].
    pub fn new(titlepage: Option<TitlePage>, elements: Vec<Span<Element>>) -> Self {
        Self {
            titlepage,
            elements,
        }
    }

    /// Set the [`TitlePage`] on a [`Screenplay`].
    pub fn set_titlepage(&mut self, titlepage: Option<TitlePage>) {
        self.titlepage = titlepage;
    }
}

/// Meta information about a [`Element`]
#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub struct Span<T> {
    pub start_line: usize,
    pub end_line: usize,
    pub inner: T,
}

impl<T> Span<T> {
    pub fn new(inner: T, start_line: usize) -> Self {
        Self {
            start_line,
            end_line: start_line,
            inner,
        }
    }
}

/// The components of a [`Screenplay`], like scene headings, action, dialogue, etc.
#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub enum Element {
    Heading {
        slug: RichString,
        number: Option<String>,
    },
    Action(RichString),
    Dialogue(Dialogue),
    DualDialogue(Dialogue, Dialogue),
    Lyrics(RichString),
    Transition(RichString),
    CenteredText(RichString),
    Synopsis(RichString),
    Section(RichString),
    Shot(RichString),
    PageBreak,
}

/// Dialogue consisting of a character name, an extension, parentheticals and lines.
/// A single [Dialogue] can have multiple parentheticals and lines.
///
/// NAME (extension)
/// (parenthetical)
/// Line.
#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub struct Dialogue {
    pub character: RichString,
    pub extension: Option<RichString>,
    pub elements: Vec<DialogueElement>,
}

impl Dialogue {
    /// Creates an empty [Dialogue].
    pub fn new() -> Self {
        Self {
            character: RichString::new(),
            extension: None,
            elements: Vec::new(),
        }
    }
}

impl Default for Dialogue {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub enum DialogueElement {
    Parenthetical(RichString),
    Line(RichString),
}

/// The information for a title page. Each field may be empty as none are strictly required
/// according to the fountain specification.
#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub struct TitlePage {
    pub title: Vec<RichString>,
    pub credit: Vec<RichString>,
    pub authors: Vec<RichString>,
    pub source: Vec<RichString>,
    pub draft_date: Vec<RichString>,
    pub contact: Vec<RichString>,
    pub notes: Vec<RichString>,
}

impl TitlePage {
    /// Creates a new empty [`TitlePage`].
    pub fn new() -> Self {
        Self {
            title: Vec::new(),
            credit: Vec::new(),
            authors: Vec::new(),
            source: Vec::new(),
            draft_date: Vec::new(),
            contact: Vec::new(),
            notes: Vec::new(),
        }
    }
}

impl Default for TitlePage {
    fn default() -> Self {
        Self::new()
    }
}
