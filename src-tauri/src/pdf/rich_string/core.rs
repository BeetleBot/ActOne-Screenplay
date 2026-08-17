use std::fmt::Display;
use std::str::Chars;

use bitflags::bitflags;

use super::parser;
use super::tokenizer;

/// A string that can have different parts styled.
///
/// New lines will always appear as their own non styled element.
/// The [`RichString`] is comprised of a collection of [`Element`]s that each
/// hold a [`String`] and a combination of stylings. The available styles are:
///
/// - `**bold**` → **bold**
/// - `*italic*` → *italic*
/// - `_underline_` → <u>underline</u>
///
/// as specified in the `Fountain` specification.
/// Emphasis is parsed in accordance to the `CommonMark` specification.
/// Furthermore, these can be combined in any overlapping order. Use `\` for a styling character to be
/// ignored for style parsing.
///
/// # Examples
///
/// ```
/// use actone_lib::pdf::rich_string::RichString;
///
/// let mut rs = RichString::from("Hello **world!**");
///
/// assert_eq!(rs.elements[0].text, "Hello ".to_string());
/// assert_eq!(rs.elements[1].text, "world!".to_string());
/// assert!(rs.elements[1].is_bold());
/// ```
#[must_use]
#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub struct RichString {
    pub elements: Vec<Element>,
}

impl RichString {
    /// Create a new, empty, [`RichString`].
    pub fn new() -> Self {
        RichString {
            elements: Vec::new(),
        }
    }

    /// The total length of a [`RichString`], meaning the total number of [`char`]s.
    pub fn char_count(&self) -> usize {
        let mut len = 0;
        for e in &self.elements {
            len += e.text.chars().count();
        }
        len
    }

    /// Gets a [`char`] from a "global" index, meaning the index when viewing the [`RichString`] as
    /// a single string without any style attributes taken into account.
    ///
    /// # Examples
    ///
    /// ```
    /// use actone_lib::pdf::rich_string::RichString;
    ///
    /// let mut rs = RichString::from("He**llo**");
    ///
    /// assert_eq!(rs.get_char(1), Some('e'));
    /// assert_eq!(rs.get_char(3), Some('l'));
    /// assert_eq!(rs.get_char(5), None);
    /// ```
    pub fn get_char(&self, mut index: usize) -> Option<char> {
        if index >= self.char_count() {
            return None;
        }
        for e in &self.elements {
            if index >= e.text.chars().count() {
                index -= e.text.chars().count();
                continue;
            }
            return e.text.chars().nth(index);
        }
        None
    }

    /// Given a "global" index, gets the [`Element`] which contains it, and the "local" index
    /// pointing to that character in the element.
    ///
    /// # Examples
    ///
    /// ```
    /// use actone_lib::pdf::rich_string::RichString;
    ///
    /// let mut rs = RichString::from("He**ll**o");
    ///
    /// assert!(matches!(rs.get_element_from_index(1), Some((_, 1))));
    /// assert!(matches!(rs.get_element_from_index(2), Some((_, 0))));
    /// assert!(matches!(rs.get_element_from_index(3), Some((_, 1))));
    /// assert!(matches!(rs.get_element_from_index(4), Some((_, 0))));
    /// ```
    pub fn get_element_from_index(&self, mut index: usize) -> Option<(&Element, usize)> {
        if index >= self.char_count() {
            return None;
        }
        for e in &self.elements {
            if index >= e.text.chars().count() {
                index -= e.text.chars().count();
                continue;
            }
            return Some((e, index));
        }
        None
    }

    /// Creates an [`char`] iterator over the [`RichString`], without the style attributes of each
    /// [`char`] taken into account.
    pub fn iter(&'_ self) -> RichIterator<'_> {
        RichIterator {
            rich_string: self,
            element_idx: 0,
            chars_iterator: if self.elements.is_empty() {
                "".chars()
            } else {
                self.elements[0].text.chars()
            },
        }
    }

    /// Appends a [`RichString`] to self. Will merge the last [`Element`] of self, and the
    /// first of the other if they have the same style attributes.
    pub fn append(&mut self, mut other: Self) {
        if let Some(e) = other.elements.first()
            && let Some(l) = self.elements.last_mut()
            && e.attributes == l.attributes
        {
            l.text.push_str(&e.text);
            other.elements.drain(..1);
            self.elements.append(&mut other.elements);
            return;
        }
        self.elements.append(&mut other.elements);
    }

    /// Pushes a string onto the [`RichString`]. Will divide the string into
    /// multiple elements with different styles if input string can be parsed with styles.
    pub fn push_str(&mut self, str: impl AsRef<str>) {
        let str = str.as_ref();
        let (tokens, mut delimiters) = tokenizer::tokenize(str);
        let matches = parser::match_delimiters(&mut delimiters);
        parser::push_parsed(self, &tokens, &delimiters, &matches);
    }

    /// Converts the [`RichString`] to a plain [`String`] by just combining the string elements
    /// without adding delimiters.
    ///
    /// # Examples
    ///
    /// ```
    /// use actone_lib::pdf::rich_string::RichString;
    ///
    /// let mut rs = RichString::from("He**ll**o");
    ///
    /// assert_eq!(rs.to_plain_string(), "Hello".to_string());
    /// ```
    pub fn to_plain_string(&self) -> String {
        let mut str = String::with_capacity(self.char_count());
        for element in &self.elements {
            str.push_str(&element.text);
        }

        str
    }

    /// Converts all text elements to uppercase.
    pub fn make_uppercase(&mut self) {
        for element in &mut self.elements {
            element.text = element.text.to_uppercase();
        }
    }
}

impl Default for RichString {
    fn default() -> Self {
        Self::new()
    }
}

impl Display for RichString {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut str = String::with_capacity(self.char_count());

        for element in &self.elements {
            macro_rules! attr_to_delim {
                ($attr:ident, $delimiter:expr) => {
                    if element.$attr() { $delimiter } else { "" }
                };
            }

            let element_text = format!(
                "{}{}{}{}{}{}{}",
                attr_to_delim!(is_bold, "**"),
                attr_to_delim!(is_italic, "*"),
                attr_to_delim!(is_underline, "_"),
                element.text,
                attr_to_delim!(is_underline, "_"),
                attr_to_delim!(is_italic, "*"),
                attr_to_delim!(is_bold, "**"),
            );
            str.push_str(&element_text);
        }

        write!(f, "{str}")
    }
}

impl<T> From<T> for RichString
where
    T: AsRef<str>,
{
    fn from(str: T) -> Self {
        let mut out = RichString::new();
        out.push_str(str);
        out
    }
}

/// An intermediate iterator which allows for seamless iteration over the [Chars] inside a
/// [`RichString`].
pub struct RichIterator<'a> {
    pub(crate) rich_string: &'a RichString,
    pub(crate) element_idx: usize,
    pub(crate) chars_iterator: Chars<'a>,
}

impl<'a> Iterator for RichIterator<'a> {
    type Item = char;

    fn next(&mut self) -> Option<Self::Item> {
        let next = self.chars_iterator.next();
        if next.is_some() {
            return next;
        }
        self.element_idx += 1;
        if self.element_idx >= self.rich_string.elements.len() {
            return None;
        }
        self.chars_iterator = self.rich_string.elements[self.element_idx].text.chars();
        self.chars_iterator.next()
    }
}

/// A [`RichString`] component, containing a [String] and the style attributes
/// belonging to said string.
#[must_use]
#[derive(Debug, PartialEq, Eq, Clone, Default, Hash)]
pub struct Element {
    pub text: String,
    pub(crate) attributes: Attributes,
}

impl Element {
    /// Creates a new element based on a [String] with no attributes. Does not parse the
    /// string.
    pub fn new(text: String) -> Self {
        Self {
            text,
            attributes: Attributes::empty(),
        }
    }

    /// If the element is styled as bold.
    #[must_use]
    pub fn is_bold(&self) -> bool {
        self.attributes.contains(Attributes::BOLD)
    }

    /// Sets the element to be formatted as bold.
    pub fn set_bold(&mut self) {
        self.attributes.insert(Attributes::BOLD);
    }

    /// Sets the element to be formatted as italic.
    pub fn set_italic(&mut self) {
        self.attributes.insert(Attributes::ITALIC);
    }

    /// If the element is styled as underline.
    #[must_use]
    pub fn is_underline(&self) -> bool {
        self.attributes.contains(Attributes::UNDERLINE)
    }

    /// Sets the element to be formatted as underline.
    pub fn set_underline(&mut self) {
        self.attributes.insert(Attributes::UNDERLINE);
    }

    /// If the element is styled as italic.
    #[must_use]
    pub fn is_italic(&self) -> bool {
        self.attributes.contains(Attributes::ITALIC)
    }

    /// If the element is styled as sans-serif.
    #[must_use]
    pub fn is_sans(&self) -> bool {
        self.attributes.contains(Attributes::SANS)
    }

    /// Sets the element to be formatted as sans-serif.
    pub fn set_sans(&mut self) {
        self.attributes.insert(Attributes::SANS);
    }
}

bitflags! {
    /// A bit array keeping track of style attributes for a [RichString].
    #[derive(Debug, PartialEq, Eq, Clone, Copy, Hash, Default)]
    pub struct Attributes: u8 {
        const BOLD      = 0b001;
        const UNDERLINE = 0b010;
        const ITALIC    = 0b100;
        const SANS      = 0b1000;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn appends_same_attributes() {
        let mut rs: RichString = "a*b*".into();
        let other: RichString = "*c*d".into();
        rs.append(other);
        assert_eq!(rs.elements[1].text, "bc".to_string())
    }

    #[test]
    fn displays_with_delims() {
        let rs: RichString = "H**e**_ll_**_o_**".into();
        assert_eq!(rs, rs.to_string().into())
    }
}
