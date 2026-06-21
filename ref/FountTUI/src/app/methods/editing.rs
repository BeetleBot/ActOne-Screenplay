use crate::app::{App, LastEdit, HistoryState};
use crate::types::LineType;
use crate::formatting::StringCaseExt;

impl App {
    pub fn cut_line(&mut self) {
        if self.last_edit != LastEdit::Cut {
            self.save_state(true);
        }

        if self.cursor_y < self.lines.len() {
            let cut_line = self.lines.remove(self.cursor_y);
            if self.revised_lines.len() > self.cursor_y {
                self.revised_lines.remove(self.cursor_y);
            }

            if self.last_edit == LastEdit::Cut {
                if let Some(buf) = &mut self.cut_buffer {
                    buf.push('\n');
                    buf.push_str(&cut_line);
                }
            } else {
                self.cut_buffer = Some(cut_line);
            }
            self.last_edit = LastEdit::Cut;

            if self.lines.is_empty() {
                self.lines.push(String::new());
            }
            if self.cursor_y >= self.lines.len() {
                self.cursor_y = self.lines.len().saturating_sub(1);
                self.cursor_x = self.line_len(self.cursor_y);
            } else {
                self.cursor_x = 0;
            }
            self.dirty = true;
        }
    }

    pub fn paste_line(&mut self) {
        if let Some(cut_buf) = self.cut_buffer.clone() {
            self.save_state(true);
            let lines_to_paste: Vec<&str> = cut_buf.split('\n').collect();
            for (i, l) in lines_to_paste.iter().enumerate() {
                self.lines
                    .insert(self.cursor_y + i, l.replace('\t', "    "));
                self.revised_lines.insert(self.cursor_y + i, self.revision_mode);
            }
            self.cursor_y += lines_to_paste.len();
            self.cursor_x = 0;
            self.dirty = true;
            self.last_edit = LastEdit::Other;
        }
    }

    pub fn save_state(&mut self, force: bool) {
        let state = HistoryState {
            lines: self.lines.clone(),
            revised_lines: self.revised_lines.clone(),
            cursor_y: self.cursor_y,
            cursor_x: self.cursor_x,
        };
        if force
            || self
                .undo_stack
                .last()
                .is_none_or(|last| last.lines != state.lines || last.revised_lines != state.revised_lines)
        {
            self.undo_stack.push(state);
            if self.undo_stack.len() > 640 {
                self.undo_stack.remove(0);
            }
            self.redo_stack.clear();
        }
    }

    pub fn undo(&mut self) -> bool {
        if let Some(state) = self.undo_stack.pop() {
            self.redo_stack.push(HistoryState {
                lines: self.lines.clone(),
                revised_lines: self.revised_lines.clone(),
                cursor_y: self.cursor_y,
                cursor_x: self.cursor_x,
            });
            self.lines = state.lines;
            self.revised_lines = state.revised_lines;
            self.cursor_y = state.cursor_y;
            self.cursor_x = state.cursor_x;
            self.dirty = true;
            self.last_edit = LastEdit::None;
            true
        } else {
            false
        }
    }

    pub fn redo(&mut self) -> bool {
        if let Some(state) = self.redo_stack.pop() {
            self.undo_stack.push(HistoryState {
                lines: self.lines.clone(),
                revised_lines: self.revised_lines.clone(),
                cursor_y: self.cursor_y,
                cursor_x: self.cursor_x,
            });
            self.lines = state.lines;
            self.revised_lines = state.revised_lines;
            self.cursor_y = state.cursor_y;
            self.cursor_x = state.cursor_x;
            self.dirty = true;
            self.last_edit = LastEdit::None;
            true
        } else {
            false
        }
    }

    pub fn clear_selection(&mut self) {
        self.selection_anchor = None;
    }

    pub fn selection_range(&self) -> Option<((usize, usize), (usize, usize))> {
        let anchor = self.selection_anchor?;
        let cursor = (self.cursor_y, self.cursor_x);
        if anchor <= cursor {
            Some((anchor, cursor))
        } else {
            Some((cursor, anchor))
        }
    }

    pub fn selected_text(&self) -> String {
        let Some(((sl, sc), (el, ec))) = self.selection_range() else {
            return String::new();
        };
        if sl == el {
            // Single line
            let line = &self.lines[sl];
            let chars: Vec<char> = line.chars().collect();
            let sc = sc.min(chars.len());
            let ec = ec.min(chars.len());
            chars[sc..ec].iter().collect()
        } else {
            let mut result = String::new();
            // First partial line
            let first: Vec<char> = self.lines[sl].chars().collect();
            let sc = sc.min(first.len());
            result.push_str(&first[sc..].iter().collect::<String>());
            result.push('\n');
            // Middle lines
            for li in (sl + 1)..el {
                result.push_str(&self.lines[li]);
                result.push('\n');
            }
            // Last partial line
            let last: Vec<char> = self.lines[el].chars().collect();
            let ec = ec.min(last.len());
            result.push_str(&last[..ec].iter().collect::<String>());
            result
        }
    }

    pub fn delete_selection(&mut self) -> bool {
        let Some(((sl, sc), (el, ec))) = self.selection_range() else {
            return false;
        };
        self.selection_anchor = None;

        if sl == el {
            let chars: Vec<char> = self.lines[sl].chars().collect();
            let sc = sc.min(chars.len());
            let ec = ec.min(chars.len());
            let new_line: String = chars[..sc].iter().chain(chars[ec..].iter()).collect();
            self.lines[sl] = new_line;
        } else {
            let prefix: String = self.lines[sl].chars().take(sc).collect();
            let suffix: String = self.lines[el].chars().skip(ec).collect();
            self.lines[sl] = format!("{}{}", prefix, suffix);
            self.lines.drain((sl + 1)..=el);
            self.types.drain((sl + 1)..=el);
            if self.revised_lines.len() < self.lines.len() + (el - sl) {
                self.revised_lines.resize(self.lines.len() + (el - sl), false);
            }
            self.revised_lines.drain((sl + 1)..=el);
            self.mark_line_revised(sl);
        }

        self.cursor_y = sl;
        self.cursor_x = sc;
        true
    }

    pub fn copy_to_clipboard(&mut self) {
        let text = self.selected_text();
        if text.is_empty() {
            return;
        }
        match arboard::Clipboard::new() {
            Ok(mut cb) => {
                if let Err(e) = cb.set_text(text) {
                    self.set_status(&format!("Clipboard error: {}", e));
                } else {
                    self.set_status("Copied to clipboard");
                }
            }
            Err(e) => self.set_status(&format!("Clipboard unavailable: {}", e)),
        }
    }

    pub fn cut_to_clipboard(&mut self) -> bool {
        let text = self.selected_text();
        if text.is_empty() {
            return false;
        }
        if let Ok(mut cb) = arboard::Clipboard::new() {
            let _ = cb.set_text(text);
        }
        self.delete_selection()
    }

    pub fn paste_from_clipboard(&mut self) {
        match arboard::Clipboard::new() {
            Ok(mut cb) => {
                match cb.get_text() {
                    Ok(text) => {
                        // If selection active, replace it first
                        if self.selection_anchor.is_some() {
                            self.delete_selection();
                        }
                        // Insert text at cursor, handling multi-line paste
                        let mut first = true;
                        for part in text.split('\n') {
                            if !first {
                                self.insert_newline(false);
                            }
                            for ch in part.chars() {
                                self.insert_char(ch);
                            }
                            first = false;
                        }
                    }
                    Err(e) => self.set_status(&format!("Paste error: {}", e)),
                }
            }
            Err(e) => self.set_status(&format!("Clipboard unavailable: {}", e)),
        }
    }

    pub fn insert_char(&mut self, c: char) {
        if self.last_edit != LastEdit::Insert || c.is_whitespace() || ".,;?!()[]*\"'".contains(c) {
            self.save_state(true);
        }
        self.last_edit = LastEdit::Insert;

        let b = self.byte_of(self.cursor_y, self.cursor_x);
        let line = &self.lines[self.cursor_y];

        let next_char = line[b..].chars().next();
        let prev_char = if b > 0 {
            line[..b].chars().next_back()
        } else {
            None
        };

        let mut valid_left_quotes = 0;
        let mut prev_c_in_iter = ' ';
        for ch in line[..b].chars() {
            if ch == c && !(c == '\'' && prev_c_in_iter.is_alphanumeric()) {
                valid_left_quotes += 1;
            }
            prev_c_in_iter = ch;
        }

        let is_inside_string = valid_left_quotes % 2 != 0;
        let next_is_word = next_char.is_some_and(|nc| nc.is_alphanumeric());
        let prev_is_word = prev_char.is_some_and(|pc| pc.is_alphanumeric());

        let step_over = if c == '"' || c == '\'' {
            is_inside_string && next_char == Some(c)
        } else if c == ')' {
            next_char == Some(')')
        } else if c == ']' {
            next_char == Some(']')
        } else {
            false
        };

        if step_over {
            self.cursor_x += 1;
            self.dirty = true;
            return;
        }

        self.lines[self.cursor_y].insert(b, c);
        let new_b = b + c.len_utf8();
        self.cursor_x += 1;
        self.mark_line_revised(self.cursor_y);

        if true {
            if c == '(' {
                if !next_is_word {
                    self.lines[self.cursor_y].insert(new_b, ')');
                }
            } else if (c == '"' || c == '\'') && !is_inside_string {
                let is_apostrophe = c == '\'' && prev_is_word;
                if !is_apostrophe && !next_is_word {
                    self.lines[self.cursor_y].insert(new_b, c);
                }
            }
        }

        if c == '[' {
            if self.lines[self.cursor_y][..new_b].ends_with("[[") {
                self.lines[self.cursor_y].insert_str(new_b, "]]");
            }
        } else if c == '*' {
            if self.lines[self.cursor_y][..new_b].ends_with("/*") {
                self.lines[self.cursor_y].insert_str(new_b, "*/");
            } else if self.lines[self.cursor_y][..new_b].ends_with("**") {
                self.lines[self.cursor_y].insert_str(new_b, "**");
            }
        }

        self.dirty = true;
    }

    pub fn insert_newline(&mut self, is_shift: bool) {
        self.save_state(true);
        self.last_edit = LastEdit::Other;

        if self.revised_lines.len() != self.lines.len() {
            self.revised_lines.resize(self.lines.len(), false);
        }

        if is_shift {
            let b = self.byte_of(self.cursor_y, self.cursor_x);
            let tail = self.lines[self.cursor_y].split_off(b);
            self.lines.insert(self.cursor_y + 1, tail);
            self.revised_lines.insert(self.cursor_y + 1, self.revision_mode);
            self.cursor_y += 1;
            self.cursor_x = 0;
            self.dirty = true;
            return;
        }

        let t = self
            .types
            .get(self.cursor_y)
            .copied()
            .unwrap_or(LineType::Empty);

        let is_smart_element = matches!(
            t,
            LineType::Parenthetical | LineType::Character | LineType::DualDialogueCharacter
        );

        if is_smart_element {
            let b = self.byte_of(self.cursor_y, self.cursor_x);
            let line = &self.lines[self.cursor_y];
            let remainder = &line[b..];
            let trim_rem = remainder.trim();

            if trim_rem.is_empty() || trim_rem == ")" {
                self.lines.insert(self.cursor_y + 1, String::new());
                self.revised_lines.insert(self.cursor_y + 1, self.revision_mode);
                self.cursor_y += 1;
                self.cursor_x = 0;
                self.dirty = true;
                return;
            }
        }

        let b = self.byte_of(self.cursor_y, self.cursor_x);
        let line = &self.lines[self.cursor_y];
        let remainder = &line[b..];
        let trim_rem = remainder.trim();

        let is_closing_markup = trim_rem == ")"
            || trim_rem == "]]"
            || trim_rem == "*/"
            || trim_rem == "**"
            || trim_rem == "*"
            || trim_rem == "_"
            || trim_rem == "<"
            || trim_rem == "\""
            || trim_rem == "'"
            || (!trim_rem.is_empty() && trim_rem.chars().all(|ch| ")]*_<'\"".contains(ch)));

        let tail = if is_closing_markup {
            String::new()
        } else {
            self.lines[self.cursor_y].split_off(b)
        };
        let head_is_empty = self.lines[self.cursor_y].is_empty();

        let breaks_paragraph = matches!(
            t,
            LineType::Action
                | LineType::SceneHeading
                | LineType::Transition
                | LineType::Section
                | LineType::Synopsis
                | LineType::Shot
                | LineType::Boneyard
                | LineType::Dialogue
                | LineType::Centered
                | LineType::PageBreak
        );

        if self.config.auto_paragraph_breaks && breaks_paragraph && !head_is_empty {
            if tail.trim().is_empty() {
                self.lines.insert(self.cursor_y + 1, String::new());
                self.lines.insert(self.cursor_y + 2, String::new());
                self.revised_lines.insert(self.cursor_y + 1, self.revision_mode);
                self.revised_lines.insert(self.cursor_y + 2, self.revision_mode);
                self.mark_line_revised(self.cursor_y);
                self.cursor_y += 2;
            } else {
                self.lines.insert(self.cursor_y + 1, String::new());
                self.lines.insert(self.cursor_y + 2, String::new());
                self.lines.insert(self.cursor_y + 3, String::new());
                self.lines
                    .insert(self.cursor_y + 4, tail.trim_start().to_string());
                self.revised_lines.insert(self.cursor_y + 1, self.revision_mode);
                self.revised_lines.insert(self.cursor_y + 2, self.revision_mode);
                self.revised_lines.insert(self.cursor_y + 3, self.revision_mode);
                self.revised_lines.insert(self.cursor_y + 4, self.revision_mode);
                self.mark_line_revised(self.cursor_y);
                self.cursor_y += 2;
            }
        } else {
            self.lines.insert(self.cursor_y + 1, tail);
            self.revised_lines.insert(self.cursor_y + 1, self.revision_mode);
            self.mark_line_revised(self.cursor_y);
            self.cursor_y += 1;
        }

        self.cursor_x = 0;
        self.dirty = true;
    }

    pub fn handle_tab(&mut self) {
        if let Some(sug) = self.suggestion.take() {
            self.save_state(true);
            self.last_edit = LastEdit::Other;

            self.lines[self.cursor_y] = self.lines[self.cursor_y].to_uppercase_1to1();

            let b = self.byte_of(self.cursor_y, self.cursor_x);
            self.lines[self.cursor_y].insert_str(b, &sug);
            self.cursor_x += sug.chars().count();

            self.parse_document();
            let parsed_type = self.types[self.cursor_y];

            let line = self.lines[self.cursor_y].clone();
            let clean_line = crate::layout::strip_sigils(&line, parsed_type)
                .trim()
                .to_string();

            let is_char = self.characters.contains(&clean_line);
            let is_loc = self.locations.contains(&clean_line);

            if is_char
                && parsed_type != LineType::Character
                && parsed_type != LineType::DualDialogueCharacter
            {
                if !self.lines[self.cursor_y].starts_with('@') {
                    self.lines[self.cursor_y].insert(0, '@');
                    self.cursor_x += 1;
                }
            } else if is_loc
                && !is_char
                && parsed_type != LineType::SceneHeading
                && !self.lines[self.cursor_y].starts_with('.')
            {
                self.lines[self.cursor_y].insert(0, '.');
                self.cursor_x += 1;
            }

            self.dirty = true;
            return;
        }

        self.save_state(true);
        self.last_edit = LastEdit::Other;

        let lt = self.types[self.cursor_y];
        let line = self.lines[self.cursor_y].clone();
        let trim = line.trim();
        let prev_t = if self.cursor_y > 0 {
            self.types[self.cursor_y - 1]
        } else {
            LineType::Empty
        };

        if trim.is_empty() {
            if matches!(
                prev_t,
                LineType::Character
                    | LineType::DualDialogueCharacter
                    | LineType::Dialogue
                    | LineType::Parenthetical
            ) {
                self.lines[self.cursor_y] = "()".to_string();
                self.cursor_x = 1;
            } else {
                self.lines[self.cursor_y] = "@".to_string();
                self.cursor_x = 1;
            }
        } else if trim == "()" {
            self.lines[self.cursor_y] = "@".to_string();
            self.cursor_x = 1;
        } else if trim == "@" {
            self.lines[self.cursor_y] = ".".to_string();
            self.cursor_x = 1;
        } else if trim == "." {
            self.lines[self.cursor_y] = ">".to_string();
            self.cursor_x = 1;
        } else if trim == ">" {
            self.lines[self.cursor_y] = String::new();
            self.cursor_x = 0;
        } else if lt == LineType::Action {
            if line.starts_with('!')
                || line.starts_with('~')
                || line.starts_with('=')
                || line.starts_with('#')
            {
                let stripped = line.trim_start_matches(['!', '~', '=', '#']);
                self.lines[self.cursor_y] = stripped.to_string();
                self.cursor_x = self.cursor_x.saturating_sub(line.len() - stripped.len());
            } else if line.starts_with('.') {
                self.lines[self.cursor_y] = line.replacen('.', ">", 1);
            } else if !line.starts_with('@') {
                let upper_prefix = line.trim_start().to_uppercase_1to1();
                let mut best_match: Option<&String> = None;

                if !upper_prefix.is_empty() {
                    for c in &self.characters {
                        if c.starts_with(&upper_prefix)
                            && c.len() > upper_prefix.len()
                            && best_match.is_none_or(|b| c.len() < b.len())
                        {
                            best_match = Some(c);
                        }
                    }
                }

                if let Some(c) = best_match {
                    self.suggestion = Some(c[upper_prefix.len()..].to_string());
                } else {
                    self.lines[self.cursor_y].insert(0, '@');
                    self.cursor_x += 1;
                }
            }
        } else if matches!(
            lt,
            LineType::Shot | LineType::Lyrics | LineType::Synopsis | LineType::Section
        ) {
            let stripped = line.trim_start_matches(['!', '~', '=', '#']);
            self.lines[self.cursor_y] = stripped.to_string();
            self.cursor_x = self.cursor_x.saturating_sub(line.len() - stripped.len());
        } else if lt == LineType::Character || lt == LineType::DualDialogueCharacter {
            if line.starts_with('@') {
                self.lines[self.cursor_y] = line.replacen('@', ".", 1);
            } else {
                self.lines[self.cursor_y].insert(0, '.');
                self.cursor_x += 1;
            }
        } else if lt == LineType::Dialogue {
            self.lines[self.cursor_y] = format!("({})", trim);
            self.cursor_x = self.lines[self.cursor_y].chars().count() - 1;
        } else if lt == LineType::Parenthetical {
            if trim.starts_with('(') && trim.ends_with(')') {
                self.lines[self.cursor_y] = trim[1..trim.len() - 1].to_string();
                self.cursor_x = self.lines[self.cursor_y].chars().count();
            } else if line.starts_with('(') {
                let mut s = line.replacen('(', "", 1);
                if let Some(idx) = s.rfind(')') {
                    s.remove(idx);
                }
                self.lines[self.cursor_y] = s;
                self.cursor_x = self.cursor_x.saturating_sub(1);
            }
        } else if lt == LineType::SceneHeading {
            if line.starts_with('.') {
                self.lines[self.cursor_y] = line.replacen('.', ">", 1);
            } else {
                self.lines[self.cursor_y].insert(0, '>');
                self.cursor_x += 1;
            }
        } else if lt == LineType::Transition
            && line.starts_with('>')
            && let Some(stripped) = line.strip_prefix('>')
        {
            self.lines[self.cursor_y] = stripped.to_string();
            self.cursor_x = self.cursor_x.saturating_sub(1);
        } else if line.starts_with('!')
            || line.starts_with('~')
            || line.starts_with('=')
            || line.starts_with('#')
        {
            let stripped = line.trim_start_matches(['!', '~', '=', '#']);
            self.lines[self.cursor_y] = stripped.to_string();
            self.cursor_x = self.cursor_x.saturating_sub(line.len() - stripped.len());
        }
        self.dirty = true;
    }

    pub fn backspace(&mut self) {
        if self.last_edit != LastEdit::Delete {
            self.save_state(true);
        }
        self.last_edit = LastEdit::Delete;

        let max = self.line_len(self.cursor_y);
        if self.cursor_x > max {
            self.cursor_x = max;
        }

        if self.cursor_x > 0 {
            let line = &self.lines[self.cursor_y];
            let cx = self.cursor_x;

            if cx >= 1 && cx < line.chars().count() {
                let mut chars = line.chars().skip(cx - 1);
                if let (Some(c1), Some(c2)) = (chars.next(), chars.next())
                    && matches!((c1, c2), ('(', ')') | ('"', '"') | ('\'', '\''))
                {
                    let b_start = self.byte_of(self.cursor_y, cx - 1);
                    let b_end = self.byte_of(self.cursor_y, cx + 1);
                    self.lines[self.cursor_y].replace_range(b_start..b_end, "");
                    self.cursor_x -= 1;
                    self.dirty = true;
                    return;
                }
            }

            if cx >= 2 && cx + 1 < line.chars().count() {
                let mut chars = line.chars().skip(cx - 2);
                if let (Some(c1), Some(c2), Some(c3), Some(c4)) =
                    (chars.next(), chars.next(), chars.next(), chars.next())
                {
                    let arr = [c1, c2, c3, c4];
                    if matches!(
                        arr,
                        ['[', '[', ']', ']'] | ['/', '*', '*', '/'] | ['*', '*', '*', '*']
                    ) {
                        let b_start = self.byte_of(self.cursor_y, cx - 2);
                        let b_end = self.byte_of(self.cursor_y, cx + 2);
                        self.lines[self.cursor_y].replace_range(b_start..b_end, "");
                        self.cursor_x -= 2;
                        self.dirty = true;
                        return;
                    }
                }
            }

            let b = self.byte_of(self.cursor_y, self.cursor_x - 1);
            self.lines[self.cursor_y].remove(b);
            self.cursor_x -= 1;
            self.mark_line_revised(self.cursor_y);
            self.dirty = true;
        } else if self.cursor_y > 0 {
            let tail = self.lines.remove(self.cursor_y);
            if self.revised_lines.len() > self.cursor_y {
                self.revised_lines.remove(self.cursor_y);
            }
            self.cursor_y -= 1;
            self.cursor_x = self.line_len(self.cursor_y);
            self.lines[self.cursor_y].push_str(&tail);
            self.mark_line_revised(self.cursor_y);
            self.dirty = true;
        }
    }

    pub fn delete_forward(&mut self) {
        if self.last_edit != LastEdit::Delete {
            self.save_state(true);
        }
        self.last_edit = LastEdit::Delete;

        let max = self.line_len(self.cursor_y);
        if self.cursor_x > max {
            self.cursor_x = max;
        }

        let line = &self.lines[self.cursor_y];
        let cx = self.cursor_x;

        let mut chars = line.chars().skip(cx);
        let c1 = chars.next();
        let c2 = chars.next();
        let c3 = chars.next();
        let c4 = chars.next();

        if let (Some(a), Some(b)) = (c1, c2) {
            if matches!((a, b), ('(', ')') | ('"', '"') | ('\'', '\'')) {
                let b_start = self.byte_of(self.cursor_y, cx);
                let b_end = self.byte_of(self.cursor_y, cx + 2);
                self.lines[self.cursor_y].replace_range(b_start..b_end, "");
                self.dirty = true;
                return;
            }

            if let (Some(c), Some(d)) = (c3, c4)
                && matches!(
                    [a, b, c, d],
                    ['[', '[', ']', ']'] | ['/', '*', '*', '/'] | ['*', '*', '*', '*']
                )
            {
                let b_start = self.byte_of(self.cursor_y, cx);
                let b_end = self.byte_of(self.cursor_y, cx + 4);
                self.lines[self.cursor_y].replace_range(b_start..b_end, "");
                self.dirty = true;
                return;
            }
        }

        if self.cursor_x < max {
            let b = self.byte_of(self.cursor_y, self.cursor_x);
            self.lines[self.cursor_y].remove(b);
            self.mark_line_revised(self.cursor_y);
            self.dirty = true;
        } else if self.cursor_y + 1 < self.lines.len() {
            let next = self.lines.remove(self.cursor_y + 1);
            if self.revised_lines.len() > self.cursor_y + 1 {
                self.revised_lines.remove(self.cursor_y + 1);
            }
            self.lines[self.cursor_y].push_str(&next);
            self.mark_line_revised(self.cursor_y);
            self.dirty = true;
        }
    }

    pub fn delete_word_back(&mut self) {
        let max = self.line_len(self.cursor_y);
        if self.cursor_x > max {
            self.cursor_x = max;
        }

        if self.cursor_x == 0 {
            self.backspace();
            return;
        }
        self.save_state(true);
        self.last_edit = LastEdit::Other;

        let mut chars: Vec<char> = self.lines[self.cursor_y].chars().collect();
        while self.cursor_x > 0 && chars[self.cursor_x - 1].is_whitespace() {
            self.cursor_x -= 1;
            chars.remove(self.cursor_x);
        }
        while self.cursor_x > 0 && !chars[self.cursor_x - 1].is_whitespace() {
            self.cursor_x -= 1;
            chars.remove(self.cursor_x);
        }
        self.lines[self.cursor_y] = chars.into_iter().collect();
        self.mark_line_revised(self.cursor_y);
        self.dirty = true;
    }

    pub fn delete_word_forward(&mut self) {
        let max = self.line_len(self.cursor_y);
        if self.cursor_x > max {
            self.cursor_x = max;
        }

        let mut chars: Vec<char> = self.lines[self.cursor_y].chars().collect();
        if self.cursor_x == chars.len() {
            self.delete_forward();
            return;
        }
        self.save_state(true);
        self.last_edit = LastEdit::Other;

        while self.cursor_x < chars.len() && chars[self.cursor_x].is_whitespace() {
            chars.remove(self.cursor_x);
        }
        while self.cursor_x < chars.len() && !chars[self.cursor_x].is_whitespace() {
            chars.remove(self.cursor_x);
        }
        self.lines[self.cursor_y] = chars.into_iter().collect();
        self.mark_line_revised(self.cursor_y);
        self.dirty = true;
    }

    pub fn replace_current_match(&mut self, replacement: &str) -> bool {
        if let Some(idx) = self.current_match_idx
            && idx < self.search_matches.len()
        {
            let (y, x) = self.search_matches[idx];
                let search_len = self.last_search.chars().count();

                self.save_state(true);
                let b_start = self.byte_of(y, x);
                let b_end = self.byte_of(y, x + search_len);

                self.lines[y].replace_range(b_start..b_end, replacement);
                self.mark_line_revised(y);

                self.dirty = true;
                self.last_edit = LastEdit::Other;
                self.parse_document();
                self.update_layout();

                self.show_search_highlight = false;
                self.search_matches.clear();
                self.current_match_idx = None;

                return true;
        }
        false
    }

    pub fn replace_all_matches(&mut self, replacement: &str) -> usize {
        let Some(re) = self.compiled_search_regex.clone() else {
            return 0;
        };

        self.save_state(true);
        let mut count = 0;
        let mut changed = false;

        for line in &mut self.lines {
            if re.is_match(line) {
                let occurrences = re.find_iter(line).count();
                count += occurrences;
                *line = re.replace_all(line, replacement).to_string();
                changed = true;
            }
        }

        if changed {
            self.dirty = true;
            self.last_edit = LastEdit::Other;
            self.parse_document();
            self.update_layout();

            self.show_search_highlight = false;
            self.search_matches.clear();
            self.current_match_idx = None;
        }

        count
    }
}

impl crate::app::App {
    pub fn line_len(&self, y: usize) -> usize {
        self.lines.get(y).map(|l| l.chars().count()).unwrap_or(0)
    }

    pub fn byte_of(&self, y: usize, cx: usize) -> usize {
        self.lines[y]
            .char_indices()
            .nth(cx)
            .map(|(b, _)| b)
            .unwrap_or(self.lines[y].len())
    }

    pub fn insert_str(&mut self, text: &str) {
        if text.is_empty() {
            return;
        }
        self.save_state(true);
        self.last_edit = LastEdit::Other;

        let b = self.byte_of(self.cursor_y, self.cursor_x);
        let current_line = self.lines[self.cursor_y].clone();
        let prefix = current_line[..b].to_string();
        let suffix = current_line[b..].to_string();

        let mut lines: Vec<String> = text.lines().map(|s| s.to_string()).collect();
        if text.ends_with('\n') {
            lines.push(String::new());
        }

        if lines.is_empty() {
            return;
        }

        if lines.len() == 1 {
            self.lines[self.cursor_y] = format!("{}{}{}", prefix, lines[0], suffix);
            self.cursor_x += lines[0].chars().count();
        } else {
            self.lines[self.cursor_y] = format!("{}{}", prefix, lines[0]);
            let mut insert_idx = self.cursor_y + 1;
            for line in lines.iter().take(lines.len() - 1).skip(1) {
                self.lines.insert(insert_idx, line.clone());
                self.types.insert(insert_idx, LineType::Action);
                if insert_idx <= self.revised_lines.len() {
                    self.revised_lines.insert(insert_idx, self.revision_mode);
                }
                insert_idx += 1;
            }
            let empty = String::new();
            let last_line_content = lines.last().unwrap_or(&empty);
            self.lines
                .insert(insert_idx, format!("{}{}", last_line_content, suffix));
            self.types.insert(insert_idx, LineType::Action);
            if insert_idx <= self.revised_lines.len() {
                self.revised_lines.insert(insert_idx, self.revision_mode);
            }

            self.cursor_y = insert_idx;
            self.cursor_x = last_line_content.chars().count();
        }
        self.dirty = true;
    }

    pub fn clean_script(&mut self) {
        self.save_state(true);
        self.last_edit = LastEdit::Other;

        let mut trimmed_count = 0;
        let mut collapsed_count = 0;

        // 1. Basic trim of all lines
        for line in self.lines.iter_mut() {
            let old_len = line.chars().count();
            let trimmed = line.trim();
            let new_len = trimmed.chars().count();
            if new_len < old_len {
                trimmed_count += old_len - new_len;
                *line = trimmed.to_string();
            }
        }

        self.parse_document();

        // 2. Build new lines list with standardized spacing
        let mut new_lines: Vec<String> = Vec::new();
        let mut new_types: Vec<LineType> = Vec::new();

        for i in 0..self.lines.len() {
            let line = &self.lines[i];
            let t = self.types[i];

            if line.is_empty() {
                continue;
            }

            // --- SPACING BEFORE ---
            let needs_blank_before = match t {
                LineType::SceneHeading
                | LineType::Transition
                | LineType::Section
                | LineType::Synopsis
                | LineType::Shot
                | LineType::PageBreak => !new_lines.is_empty(),
                LineType::Character | LineType::DualDialogueCharacter => {
                    if let Some((_, prev_t)) = self.get_last_non_empty_type(&new_lines, &new_types) {
                        !matches!(prev_t, LineType::SceneHeading | LineType::Transition)
                    } else {
                        false
                    }
                }
                LineType::Action => {
                    if let Some((_, prev_t)) = self.get_last_non_empty_type(&new_lines, &new_types) {
                        !matches!(prev_t, LineType::SceneHeading)
                    } else {
                        false
                    }
                }
                _ => false,
            };

            if needs_blank_before && !new_lines.last().is_some_and(|l| l.is_empty()) {
                new_lines.push(String::new());
                new_types.push(LineType::Empty);
            }

            // --- SPACING BETWEEN DIALOGUE PIECES ---
            if matches!(t, LineType::Parenthetical | LineType::Dialogue)
                && new_lines.last().is_some_and(|l| l.is_empty())
                && let Some((_, prev_t)) = self.get_last_non_empty_type(&new_lines, &new_types)
                && matches!(
                    prev_t,
                    LineType::Character
                        | LineType::DualDialogueCharacter
                        | LineType::Parenthetical
                        | LineType::Dialogue
                )
            {
                new_lines.pop();
                new_types.pop();
                collapsed_count += 1;
            }

            new_lines.push(line.clone());
            new_types.push(t);

            // --- SPACING AFTER ---
            if t == LineType::SceneHeading {
                new_lines.push(String::new());
                new_types.push(LineType::Empty);
            }
        }

        // Final collapse
        let mut final_lines = Vec::new();
        for line in new_lines {
            if line.is_empty() && final_lines.last().is_some_and(|l: &String| l.is_empty()) {
                collapsed_count += 1;
                continue;
            }
            final_lines.push(line);
        }

        while final_lines.last().is_some_and(|l| l.is_empty()) {
            final_lines.pop();
            collapsed_count += 1;
        }

        self.lines = final_lines;
        self.parse_document();
        self.dirty = true;
        self.set_status(&format!(
            "Script cleaned: {} extra characters and {} extra lines removed",
            trimmed_count, collapsed_count
        ));
    }

    fn get_last_non_empty_type(
        &self,
        lines: &[String],
        types: &[LineType],
    ) -> Option<(usize, LineType)> {
        lines
            .iter()
            .enumerate()
            .rev()
            .find(|(_, l)| !l.is_empty())
            .map(|(i, _)| (i, types[i]))
    }
}
