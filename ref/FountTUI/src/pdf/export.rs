//! Traits for exporting [`Screenplay`]s
//!
//! This module defines the [`Exporter`] trait, which can be implented to provide
//! custom export methods. The [`Exporter`] trait is designed to be dyn-compatible
//! to allow end-application to implement dynamic pickers of exporters.
//!
//! # Implementing
//! [`Exporter::export`] returns [`std::io::Result`] and is generally expected
//! to only return Error when there is an issue with the writer.

pub mod pdf;

use std::{
    fs::File,
    io::{BufWriter, Result, Write},
    path::Path,
};

use crate::pdf::Screenplay;

/// A [`Screenplay`] exporter.
///
/// Types Implementing this trait provide logic for exporting a [`Screenplay`]
/// to some format.
pub trait Exporter {
    /// Returns the file extension for this exporter's output format,
    /// e.g. `"html"`.
    fn file_extension(&self) -> &'static str;

    /// Exports the screenplay to the given writer.
    fn export(&self, screenplay: &Screenplay, writer: &mut dyn Write) -> Result<()>;
}

/// An extension trait for [`Exporter`] providing common functionality.
///
/// There is a blanket implementation so any type implementing [`Exporter`] also
/// implements this trait, including `dyn Exporter`.
///
/// # Usage
/// This trait must be in scope to use its methods:
/// ```
/// use fount::pdf::ExporterExt;
/// ```
pub trait ExporterExt: Exporter {
    /// Exports the screenplay to stdout.
    fn export_to_stdout(&self, screenplay: &Screenplay) -> Result<()> {
        let stdout = std::io::stdout();
        let mut lock = stdout.lock();
        self.export(screenplay, &mut lock)
    }

    /// Exports the screenplay to a file at the given path.
    fn export_to_file(&self, screenplay: &Screenplay, path: impl AsRef<Path>) -> Result<()> {
        let file = File::create(path)?;
        let mut w = BufWriter::new(file);

        self.export(screenplay, &mut w)
    }

    /// Exports the screenplay to `dir/base.ext` where `ext` is determined
    /// by [`Exporter::file_extension`].
    fn export_with_extension(
        &self,
        screenplay: &Screenplay,
        dir: impl AsRef<Path>,
        base: &str,
    ) -> Result<()> {
        let path = dir
            .as_ref()
            .join(base)
            .with_extension(self.file_extension());
        self.export_to_file(screenplay, &path)
    }

    /// Exports the screenplay to a [`String`] in memory.
    fn export_to_string(&self, screenplay: &Screenplay) -> Result<String> {
        let mut buf = Vec::new();
        self.export(screenplay, &mut buf)?;
        Ok(String::from_utf8_lossy(&buf).into_owned())
    }
}

impl<T: Exporter + ?Sized> ExporterExt for T {}
