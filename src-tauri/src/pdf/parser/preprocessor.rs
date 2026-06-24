/// Type alias making it more clear what the tuple represents.
pub(super) type Line = (usize, String);

/// Keeps the state needed for when we are in a note during preprocessing.
pub(super) struct NoteState {
    pub(super) buffer: Vec<Line>,
    pub(super) pre_line: Line,
    pub(super) last_char_is_newline: bool,
}

/// Removes boneyards, notes and normalizes tabs to four spaces
pub(super) struct Preprocessor<'a> {
    result: Vec<Line>,
    current_line: Line,
    source_line: usize,
    note_state: Option<NoteState>,
    rest: &'a str,
}

impl<'a> Preprocessor<'a> {
    pub(super) fn new(src: &'a str) -> Self {
        Preprocessor {
            result: Vec::new(),
            current_line: (1, String::new()),
            source_line: 1,
            note_state: None,
            rest: src,
        }
    }

    /// Appends the given [`&str`] to the `current_line`.
    /// When encountering newlines it appends the `current_line` to `result`
    /// and advances `source_line`.
    fn append_and_advance(&mut self, s: &str) {
        let mut lines = s.split('\n');
        if let Some(first) = lines.next() {
            self.current_line.1.push_str(first);
        }

        for segment in lines {
            if let Some(NoteState { buffer, .. }) = &mut self.note_state {
                buffer.push(std::mem::take(&mut self.current_line));
            } else {
                self.result.push(std::mem::take(&mut self.current_line));
            }
            self.source_line += 1;
            self.current_line.0 = self.source_line;
            self.current_line.1.push_str(segment);
        }
    }

    /// Dump the note buffer into the result and leaving `current_line` as
    /// the current line being processed.
    fn dump_note_buffer(&mut self) {
        if let Some(NoteState {
            mut buffer,
            pre_line,
            ..
        }) = self.note_state.take()
        {
            if buffer.is_empty() {
                let note_tail = std::mem::take(&mut self.current_line.1);
                self.current_line = (pre_line.0, pre_line.1 + &note_tail);
            } else {
                buffer[0].1 = pre_line.1 + &buffer[0].1;
                buffer[0].0 = pre_line.0;
                for (ln, line) in buffer {
                    self.result.push((ln, line));
                }
            }
        }
    }

    /// The main function for the preprocessor.
    pub(super) fn process(mut self) -> Vec<Line> {
        while !self.rest.is_empty() {
            let in_note = self.note_state.is_some();

            match Preprocessor::find_earliest_token_of_interest(self.rest, in_note) {
                std::option::Option::None => {
                    let remaining = self.rest.replace('\t', "    ");
                    self.append_and_advance(&remaining);
                    break;
                }
                std::option::Option::Some((pos, token)) => {
                    let before = self.rest[..pos].replace('\t', "    ");
                    self.append_and_advance(&before);
                    self.rest = &self.rest[pos + token.len()..];

                    match token {
                        "/*" => {
                            let (boneyard, after) = match self.rest.find("*/") {
                                Some(end) => (&self.rest[..end], &self.rest[end + 2..]),
                                None => (self.rest, ""),
                            };
                            let newline_count = boneyard.chars().filter(|&c| c == '\n').count();
                            self.source_line += newline_count;

                            self.rest = after;
                        }
                        "[[" => {
                            self.note_state = Some(NoteState {
                                buffer: vec![],
                                pre_line: std::mem::take(&mut self.current_line),
                                last_char_is_newline: false,
                            });
                            self.current_line = (self.source_line, "[[".to_string());
                        }
                        "]]" => {
                            if let Some(mut n) = self.note_state.take() {
                                let note_content = &self.current_line.1;
                                let inner_tag = note_content.strip_prefix("[[").unwrap_or(note_content).trim();
                                let color_name = inner_tag.strip_prefix("color ").unwrap_or(inner_tag);
                                if is_valid_color_name(color_name) {
                                    n.pre_line.1.push_str(note_content);
                                    n.pre_line.1.push_str("]]");
                                    self.current_line = n.pre_line;
                                } else {
                                    self.current_line = n.pre_line;
                                }
                            } else {
                                self.current_line = (self.source_line, String::new());
                            }
                        }
                        "\n" => {
                            let Some(s) = &mut self.note_state else {
                                unreachable!(
                                    "We only look for this pattern when note state is some."
                                );
                            };

                            if s.last_char_is_newline
                                && (pos == 0
                                    || pos == 1 && matches!(before.chars().next(), Some(' ')))
                            {
                                self.dump_note_buffer();
                            } else {
                                s.last_char_is_newline = true;
                            }
                            self.append_and_advance("\n");
                        }
                        _ => unreachable!("Already checks all possible tokens"),
                    }
                }
            }
        }

        self.dump_note_buffer();
        if !self.current_line.1.is_empty() {
            self.result.push(self.current_line);
        }
        self.result
    }

    /// Searches for the next potential token of interest.
    /// Always looks for boneyards and other depends on if `in_note` or not.
    fn find_earliest_token_of_interest(s: &str, in_note: bool) -> Option<(usize, &str)> {
        let next_boneyard = s.find("/*");
        let next_note = if in_note { None } else { s.find("[[") };
        let next_note_end = if in_note { s.find("]]") } else { None };
        let next_note_break = if in_note { s.find('\n') } else { None };

        let mut candidates: Vec<(usize, &str)> = Vec::new();

        if let Some(p) = next_boneyard {
            candidates.push((p, "/*"));
        }
        if let Some(p) = next_note {
            candidates.push((p, "[["));
        }
        if let Some(p) = next_note_end {
            candidates.push((p, "]]"));
        }
        if let Some(p) = next_note_break {
            candidates.push((p, "\n"));
        }

        candidates.into_iter().min_by_key(|&(p, _)| p)
    }
}

fn is_valid_color_name(s: &str) -> bool {
    let s = s.trim().to_lowercase();
    matches!(
        s.as_str(),
        "red" | "blue" | "green" | "pink" | "magenta" | "gray" | "purple"
            | "cyan" | "teal" | "yellow" | "orange" | "brown"
    ) || (s.starts_with('#') && s.len() >= 4 && s.len() <= 7 && s[1..].chars().all(|c| c.is_ascii_hexdigit()))
}
