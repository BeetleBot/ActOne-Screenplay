//! This module implements a [`RichString`], meaning a *rich* string which can have multiple
//! attributes for style, and can have these on different parts of the same string.
//!
//! Parsing is done in accordance with the
//! [Fountain specification](https://fountain.io/syntax/) and emphasis in
//! accordance to [CommonMark specification](https://spec.commonmark.org/0.31.2/).
//!
//! # Examples
//!
//! ```
//! use drafter_lib::pdf::rich_string::RichString;
//!
//! let rs: RichString = "_Hello_ **world!**".into();
//!
//! assert_eq!(rs.elements[0].text, "Hello".to_string());
//! assert!(rs.elements[0].is_underline());
//! assert_eq!(rs.elements[1].text, " ".to_string());
//! assert_eq!(rs.elements[2].text, "world!".to_string());
//! assert!(rs.elements[2].is_bold());
//! ```

pub mod core;
pub mod parser;
pub mod tokenizer;

pub use self::core::{Element, RichIterator, RichString};
