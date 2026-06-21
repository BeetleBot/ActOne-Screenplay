use std::{fs, io};
use std::path::PathBuf;
use crate::app::App;

impl App {
    pub fn emergency_save(&mut self) {
        let mut to_save = Vec::new();
        to_save.push((self.file.clone(), &self.lines, self.dirty));

        for (i, buf) in self.buffers.iter().enumerate() {
            if i != self.current_buf_idx {
                to_save.push((buf.file.clone(), &buf.lines, buf.dirty));
            }
        }

        for (file, lines, dirty) in to_save {
            if !dirty || lines.is_empty() || (lines.len() == 1 && lines[0].is_empty()) {
                continue;
            }

            let dir = file
                .as_ref()
                .and_then(|p| p.parent())
                .filter(|p| !p.as_os_str().is_empty())
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

            let base_name = file
                .as_ref()
                .and_then(|p| p.file_name())
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_else(|| "fount".to_string());

            let mut backup_path = dir.join(format!("{}.save", base_name));
            let mut counter = 1;

            while backup_path.exists() && counter <= 1000 {
                backup_path = dir.join(format!("{}.save.{}", base_name, counter));
                counter += 1;
            }

            if counter <= 1000 {
                let content = lines.join("\n");
                let _ = std::fs::write(&backup_path, content);
            }
        }
    }

    pub fn set_status(&mut self, msg: &str) {
        self.status_msg = Some(msg.to_string());
        self.status_timer = Some(std::time::Instant::now());
    }

    pub fn clear_status(&mut self) {
        self.status_msg = None;
        self.status_timer = None;
    }

    pub fn load_recent_files(&mut self) {
        if let Some(proj_dirs) = directories::ProjectDirs::from("", "", "Fount") {
            let path = proj_dirs.data_dir().join("recent.txt");
            if let Ok(content) = fs::read_to_string(path) {
                self.recent_files = content
                    .lines()
                    .map(PathBuf::from)
                    .filter(|p| p.exists())
                    .collect();
            }
        }
    }

    pub fn save_recent_files(&self) {
        if let Some(proj_dirs) = directories::ProjectDirs::from("", "", "Fount") {
            let path = proj_dirs.data_dir().join("recent.txt");
            let content = self.recent_files
                .iter()
                .map(|p| p.to_string_lossy())
                .collect::<Vec<_>>()
                .join("\n");
            let _ = fs::write(path, content);
        }
    }

    pub fn add_recent_file(&mut self, path: PathBuf) {
        let path = path.canonicalize().unwrap_or(path);
        self.recent_files.retain(|p| p != &path);
        self.recent_files.insert(0, path);
        if self.recent_files.len() > 10 {
            self.recent_files.truncate(10);
        }
        self.save_recent_files();
    }

    pub fn save_as(&mut self, path: PathBuf) -> io::Result<()> {
        if self.is_tutorial {
            self.set_status("Cannot save the tutorial buffer. Press Ctrl+X to exit.");
            return Ok(());
        }
        let mut content = self.lines.join("\n");
        content.push_str(&self.get_revision_block());
        fs::write(&path, content)?;
        self.file = Some(path.clone());
        self.dirty = false;
        self.add_recent_file(path.clone());
        self.set_status(&format!(
            "Saved as {}",
            path.display()
        ));
        self.save_indicator_timer = Some(std::time::Instant::now());
        Ok(())
    }

    pub fn export_fountain(&self, path: &std::path::Path) -> std::io::Result<()> {
        let mut output_lines = Vec::new();
        let mut in_title_page = true;
        let mut lines_iter = self.lines.iter().peekable();

        // 1. Process Title Page
        while let Some(line) = lines_iter.peek() {
            if !in_title_page {
                break;
            }
            if let Some((_key, val)) = line.split_once(':') {
                let line_consumed = lines_iter.next().unwrap();
                if self.config.include_title_page {
                    output_lines.push(line_consumed.clone());
                }
                if val.trim().is_empty() {
                    while let Some(next_line) = lines_iter.peek() {
                        if next_line.starts_with("   ") || next_line.starts_with('\t') {
                            let next_consumed = lines_iter.next().unwrap();
                            if self.config.include_title_page {
                                output_lines.push(next_consumed.clone());
                            }
                        } else {
                            break;
                        }
                    }
                }
            } else {
                in_title_page = false;
                if line.trim().is_empty() {
                    let sep = lines_iter.next().unwrap();
                    if self.config.include_title_page {
                        output_lines.push(sep.clone());
                    }
                }
            }
        }

        // 2. Process the remaining lines (Sections and Synopses)
        for line in lines_iter {
            let trimmed = line.trim();
            if trimmed.starts_with('#') {
                if self.config.export_sections {
                    output_lines.push(line.clone());
                }
            } else if trimmed.starts_with('=') {
                if self.config.export_synopses {
                    output_lines.push(line.clone());
                }
            } else {
                output_lines.push(line.clone());
            }
        }

        let mut content = output_lines.join("\n");

        // 3. Process Production Tags if turned off
        if !self.config.export_production_tags {
            content = Self::strip_production_tags_from_text(&content);
        }

        content.push_str(&self.get_revision_block());
        std::fs::write(path, content)
    }

fn strip_production_tags_from_text(text: &str) -> String {
    let mut result = String::new();
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if i + 2 <= chars.len() && chars[i] == '[' && chars[i+1] == '[' {
            // Find closing ']]'
            let mut found_close = None;
            for j in (i+2)..(chars.len() - 1) {
                if chars[j] == ']' && chars[j+1] == ']' {
                    found_close = Some(j);
                    break;
                }
            }
            if let Some(close_idx) = found_close {
                let inner: String = chars[(i+2)..close_idx].iter().collect();
                if let Some((cat, _item)) = inner.split_once(':') {
                    let cat_trimmed = cat.trim().to_lowercase();
                    let is_prod_tag = matches!(
                        cat_trimmed.as_str(),
                        "cast" | "props" | "wardrobe" | "makeup" | "sfx" | "vfx" | "music" |
                        "extras" | "stunts" | "vehicles" | "animals" | "setdressing" |
                        "sound" | "equipment" | "security" | "greenery"
                    );
                    if is_prod_tag {
                        i = close_idx + 2;
                        continue;
                    }
                }
            }
        }
        result.push(chars[i]);
        i += 1;
    }
    result
}

    pub fn export_pdf(&self, path: &std::path::Path) -> std::io::Result<()> {
        let fountain_text = self.lines.join("\n");
        let paper_size = if self.config.paper_size.to_lowercase() == "letter" {
            crate::pdf::LETTER
        } else {
            crate::pdf::A4
        };

        crate::pdf::export_to_pdf(
            &fountain_text,
            path,
            crate::pdf::PdfExportConfig {
                paper_size,
                bold_scene_headings: self.config.export_bold_scene_headings,
                mirror_scene_numbers: self.config.mirror_scene_numbers.clone(),
                export_sections: self.config.export_sections,
                export_synopses: self.config.export_synopses,
                export_font: self.config.export_font.clone(),
                revised_lines: self.revised_lines.clone(),
            },
        )
    }


    pub fn export_scene_csv(&self, path: &std::path::Path) -> std::io::Result<()> {
        let mut csv = String::new();
        csv.push_str("Scene,Int/Ext,Location,Time,Length (8ths),Page,Characters,Synopsis\n");

        struct SceneRow {
            num: String,
            int_ext: String,
            location: String,
            time: String,
            length: String,
            page: usize,
            characters: std::collections::BTreeSet<String>,
            synopsis: String,
        }

        let mut scenes: Vec<SceneRow> = Vec::new();
        let mut current: Option<SceneRow> = None;
        let mut visual_lines = 0usize;

        for row in &self.layout {
            if row.line_type == crate::types::LineType::SceneHeading {
                if let Some(mut s) = current.take() {
                    let eighths = (visual_lines as f32 / 7.0).round() as usize;
                    let full = eighths / 8;
                    let rem = eighths % 8;
                    s.length = if full > 0 && rem > 0 { format!("{} {}/8", full, rem) }
                        else if full > 0 { format!("{}", full) }
                        else if rem > 0 { format!("{}/8", rem) }
                        else { "1/8".to_string() };
                    scenes.push(s);
                }

                let mut heading = crate::layout::strip_sigils(&row.raw_text, row.line_type).to_string();
                while let Some(start) = heading.find("[[") {
                    if let Some(end) = heading[start..].find("]]") {
                        heading.replace_range(start..start + end + 2, "");
                    } else { break; }
                }
                let h = heading.trim().to_uppercase();

                let (int_ext, location, time) = if let Some((ie, rest)) = h.split_once('.') {
                    let ie = ie.trim().to_string();
                    if let Some((l, t)) = rest.split_once('-') {
                        (ie, l.trim().to_string(), t.trim().to_string())
                    } else { (ie, rest.trim().to_string(), String::new()) }
                } else { (String::new(), h.clone(), String::new()) };

                current = Some(SceneRow {
                    num: row.scene_num.clone().unwrap_or_default(),
                    int_ext, location, time, length: String::new(),
                    page: row.page_num.unwrap_or(1),
                    characters: std::collections::BTreeSet::new(),
                    synopsis: String::new(),
                });
                visual_lines = 1;
            } else if let Some(ref mut s) = current {
                visual_lines += 1;
                match row.line_type {
                    crate::types::LineType::Character | crate::types::LineType::DualDialogueCharacter => {
                        let mut name = crate::layout::strip_sigils(&row.raw_text, row.line_type).trim().to_string();
                        if let Some(idx) = name.find('(') { name = name[..idx].trim().to_string(); }
                        if !name.is_empty() { s.characters.insert(name.to_uppercase()); }
                    }
                    crate::types::LineType::Synopsis => {
                        let syn = crate::layout::strip_sigils(&row.raw_text, row.line_type).trim().to_string();
                        if !syn.is_empty() { s.synopsis = syn; }
                    }
                    _ => {}
                }
            }
        }

        if let Some(mut s) = current.take() {
            let eighths = (visual_lines as f32 / 7.0).round() as usize;
            let full = eighths / 8;
            let rem = eighths % 8;
            s.length = if full > 0 && rem > 0 { format!("{} {}/8", full, rem) }
                else if full > 0 { format!("{}", full) }
                else if rem > 0 { format!("{}/8", rem) }
                else { "1/8".to_string() };
            scenes.push(s);
        }

        for s in scenes {
            let chars = s.characters.into_iter().collect::<Vec<_>>().join(", ").replace("\"", "\"\"");
            let syn = s.synopsis.replace("\"", "\"\"");
            csv.push_str(&format!(
                "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",{},\"{}\",\"{}\"\n",
                s.num, s.int_ext, s.location, s.time, s.length, s.page, chars, syn
            ));
        }

        std::fs::write(path, csv)
    }

    pub fn export_character_csv(&self, path: &std::path::Path) -> std::io::Result<()> {
        let mut csv = String::new();
        csv.push_str("Character,Dialogue Words,Dialogue Blocks,% of Dialogue,Scene Count,Scenes\n");

        #[derive(Default)]
        struct CharData {
            words: usize,
            blocks: usize,
            scenes: std::collections::BTreeSet<String>,
        }

        let mut chars: std::collections::HashMap<String, CharData> = std::collections::HashMap::new();
        let mut current_scene = String::new();
        let mut current_char = String::new();

        for row in &self.layout {
            match row.line_type {
                crate::types::LineType::SceneHeading => {
                    current_scene = row.scene_num.clone().unwrap_or_else(|| {
                        crate::layout::strip_sigils(&row.raw_text, row.line_type).trim().to_uppercase()
                    });
                }
                crate::types::LineType::Character
                | crate::types::LineType::DualDialogueCharacter => {
                    let mut name = crate::layout::strip_sigils(&row.raw_text, row.line_type).trim().to_string();
                    if let Some(idx) = name.find('(') { name = name[..idx].trim().to_string(); }
                    current_char = name.to_uppercase();
                    if !current_char.is_empty() {
                        let entry = chars.entry(current_char.clone()).or_default();
                        entry.blocks += 1;
                        if !current_scene.is_empty() { entry.scenes.insert(current_scene.clone()); }
                    }
                }
                crate::types::LineType::Dialogue => {
                    if !current_char.is_empty() {
                        let words = crate::layout::strip_sigils(&row.raw_text, row.line_type).split_whitespace().count();
                        chars.entry(current_char.clone()).or_default().words += words;
                    }
                }
                _ => {
                    if row.line_type != crate::types::LineType::Parenthetical {
                        current_char = String::new();
                    }
                }
            }
        }

        let total_words: usize = chars.values().map(|c| c.words).sum();
        let mut sorted: Vec<_> = chars.into_iter().collect();
        sorted.sort_by_key(|b| std::cmp::Reverse(b.1.words));

        for (name, data) in sorted {
            let pct = if total_words > 0 { (data.words as f64 / total_words as f64) * 100.0 } else { 0.0 };
            let scene_count = data.scenes.len();
            let scene_list = data.scenes.into_iter().collect::<Vec<_>>().join(", ");
            csv.push_str(&format!(
                "\"{}\",{},{},{:.1},{},\"{}\"\n",
                name, data.words, data.blocks, pct, scene_count, scene_list
            ));
        }

        std::fs::write(path, csv)
    }

    pub fn export_location_csv(&self, path: &std::path::Path) -> std::io::Result<()> {
        let mut csv = String::new();
        csv.push_str("Location,Int/Ext,Time,Appearances,Est. Pages,Scenes\n");

        struct LocEntry {
            scenes: Vec<String>,
            total_lines: usize,
        }

        let mut locations: std::collections::HashMap<(String, String, String), LocEntry> = std::collections::HashMap::new();
        let mut current_key: Option<(String, String, String)> = None;
        let mut scene_visual_lines = 0usize;

        for row in &self.layout {
            if row.line_type == crate::types::LineType::SceneHeading {
                if let Some(key) = current_key.take() {
                    let entry = locations.entry(key).or_insert_with(|| LocEntry { scenes: Vec::new(), total_lines: 0 });
                    entry.total_lines += scene_visual_lines;
                }

                let mut heading = crate::layout::strip_sigils(&row.raw_text, row.line_type).to_string();
                while let Some(start) = heading.find("[[") {
                    if let Some(end) = heading[start..].find("]]") {
                        heading.replace_range(start..start + end + 2, "");
                    } else { break; }
                }
                let h = heading.trim().to_uppercase();
                let s_num = row.scene_num.clone().unwrap_or_default();

                let (int_ext, loc, time) = if let Some((ie, rest)) = h.split_once('.') {
                    let ie = ie.trim().to_string();
                    if let Some((l, t)) = rest.split_once('-') {
                        (ie, l.trim().to_string(), t.trim().to_string())
                    } else { (ie, rest.trim().to_string(), String::new()) }
                } else { (String::new(), h.clone(), String::new()) };

                let key = (loc, int_ext, time);
                locations.entry(key.clone()).or_insert_with(|| LocEntry { scenes: Vec::new(), total_lines: 0 })
                    .scenes.push(if s_num.is_empty() { "-".to_string() } else { s_num });
                current_key = Some(key);
                scene_visual_lines = 1;
            } else if current_key.is_some() {
                scene_visual_lines += 1;
            }
        }

        if let Some(key) = current_key.take() {
            let entry = locations.entry(key).or_insert_with(|| LocEntry { scenes: Vec::new(), total_lines: 0 });
            entry.total_lines += scene_visual_lines;
        }

        let mut sorted: Vec<_> = locations.into_iter().collect();
        sorted.sort_by_key(|b| std::cmp::Reverse(b.1.scenes.len()));

        for ((loc, int_ext, time), data) in sorted {
            let est_pages = format!("{:.1}", data.total_lines as f32 / 56.0);
            csv.push_str(&format!(
                "\"{}\",\"{}\",\"{}\",{},{},\"{}\"\n",
                loc, int_ext, time, data.scenes.len(), est_pages, data.scenes.join(", ")
            ));
        }

        std::fs::write(path, csv)
    }

    pub fn export_note_csv(&self, path: &std::path::Path) -> std::io::Result<()> {
        let mut csv = String::new();
        csv.push_str("Type,Scene,Page,Line,Content\n");

        let mut current_scene = String::new();
        let mut current_page = 1usize;

        for row in &self.layout {
            if let Some(p) = row.page_num { current_page = p; }

            if row.line_type == crate::types::LineType::SceneHeading {
                current_scene = row.scene_num.clone().unwrap_or_else(|| {
                    let mut h = crate::layout::strip_sigils(&row.raw_text, row.line_type).trim().to_uppercase();
                    while let Some(s) = h.find("[[") {
                        if let Some(e) = h[s..].find("]]") { h.replace_range(s..s+e+2, ""); } else { break; }
                    }
                    h
                });
            }

            if row.line_type == crate::types::LineType::Boneyard {
                let text = crate::layout::strip_sigils(&row.raw_text, row.line_type).to_string().replace("\"", "\"\"");
                csv.push_str(&format!(
                    "\"Boneyard\",\"{}\",{},{},\"{}\"\n",
                    current_scene, current_page, row.line_idx + 1, text
                ));
            }

            if row.line_type == crate::types::LineType::Note {
                let text = crate::layout::strip_sigils(&row.raw_text, row.line_type).to_string().replace("\"", "\"\"");
                csv.push_str(&format!(
                    "\"Note\",\"{}\",{},{},\"{}\"\n",
                    current_scene, current_page, row.line_idx + 1, text
                ));
            }
        }

        let mut current_scene_raw = String::new();
        for (line_num, line) in self.lines.iter().enumerate() {
            let lt = self.types.get(line_num).copied().unwrap_or(crate::types::LineType::Empty);
            if lt == crate::types::LineType::SceneHeading {
                let mut h = crate::layout::strip_sigils(line, lt).trim().to_uppercase();
                while let Some(s) = h.find("[[") {
                    if let Some(e) = h[s..].find("]]") { h.replace_range(s..s+e+2, ""); } else { break; }
                }
                current_scene_raw = h;
            }
            if lt == crate::types::LineType::Note || lt == crate::types::LineType::Boneyard { continue; }

            let mut search = 0;
            while let Some(start) = line[search..].find("[[") {
                let abs_start = search + start;
                if let Some(end) = line[abs_start..].find("]]") {
                    let abs_end = abs_start + end;
                    let content = &line[abs_start + 2..abs_end];
                    if !content.contains(':') {
                        let clean = content.trim().replace("\"", "\"\"");
                        if !clean.is_empty() {
                            csv.push_str(&format!(
                                "\"Inline Note\",\"{}\",{},{},\"{}\"\n",
                                current_scene_raw, current_page, line_num + 1, clean
                            ));
                        }
                    }
                    search = abs_end + 2;
                } else { break; }
            }
        }

        std::fs::write(path, csv)
    }

    pub fn export_breakdown_csv(&self, path: &std::path::Path) -> std::io::Result<()> {
        let mut csv = String::new();
        csv.push_str("Scene Number,Int/Ext,Location,Time,Length,Cast,Props,VFX,SFX,Wardrobe,Makeup,Music,Tags\n");

        #[derive(Default)]
        struct SceneBreakdown {
            num: String,
            int_ext: String,
            location: String,
            time: String,
            length: String,
            cast: std::collections::BTreeSet<String>,
            props: std::collections::BTreeSet<String>,
            vfx: std::collections::BTreeSet<String>,
            sfx: std::collections::BTreeSet<String>,
            wardrobe: std::collections::BTreeSet<String>,
            makeup: std::collections::BTreeSet<String>,
            music: std::collections::BTreeSet<String>,
            tags: std::collections::BTreeSet<String>,
        }

        let mut scene_data: Vec<SceneBreakdown> = Vec::new();
        let mut current_scene: Option<SceneBreakdown> = None;
        let mut scene_visual_lines = 0;

        // Pass 1: Collect scene metadata and basic structure from layout
        // (Layout is better for scene headings and pagination-based length)
        for row in &self.layout {
            if row.line_type == crate::types::LineType::SceneHeading {
                if let Some(mut s) = current_scene.take() {
                    let eights_total = scene_visual_lines as f32 / 7.0;
                    let eights_rounded = eights_total.round() as usize;
                    let full_pages = eights_rounded / 8;
                    let remaining_eighths = eights_rounded % 8;
                    s.length = if full_pages > 0 && remaining_eighths > 0 {
                        format!("{} {}/8", full_pages, remaining_eighths)
                    } else if full_pages > 0 {
                        format!("{}", full_pages)
                    } else if remaining_eighths > 0 {
                        format!("{}/8", remaining_eighths)
                    } else { "1/8".to_string() };
                    scene_data.push(s);
                }

                let heading = crate::layout::strip_sigils(&row.raw_text, row.line_type).to_uppercase();
                let (int_ext, location, time) = if let Some((ie, rest)) = heading.split_once('.') {
                    let ie = ie.trim().to_string();
                    if let Some((l, t)) = rest.split_once('-') {
                        (ie, l.trim().to_string(), t.trim().to_string())
                    } else {
                        (ie, rest.trim().to_string(), String::new())
                    }
                } else {
                    (String::new(), heading, String::new())
                };

                let s = SceneBreakdown {
                    num: row.scene_num.clone().unwrap_or_default(),
                    int_ext,
                    location,
                    time,
                    ..Default::default()
                };

                current_scene = Some(s);
                scene_visual_lines = 1;
            } else if current_scene.is_some() {
                scene_visual_lines += 1;
            }
        }

        if let Some(mut s) = current_scene.take() {
            let eights_total = scene_visual_lines as f32 / 7.0;
            let eights_rounded = eights_total.round() as usize;
            let full_pages = eights_rounded / 8;
            let remaining_eighths = eights_rounded % 8;
            s.length = if full_pages > 0 && remaining_eighths > 0 {
                format!("{} {}/8", full_pages, remaining_eighths)
            } else if full_pages > 0 {
                format!("{}", full_pages)
            } else if remaining_eighths > 0 {
                format!("{}/8", remaining_eighths)
            } else { "1/8".to_string() };
            scene_data.push(s);
        }

        // Pass 2: Collect tags from raw lines and associate with scenes
        let mut scene_idx = 0;
        for (i, (line, &lt)) in self.lines.iter().zip(self.types.iter()).enumerate() {
            if lt == crate::types::LineType::SceneHeading && i > 0
                && scene_idx + 1 < scene_data.len()
            {
                scene_idx += 1;
            }

            if let Some(s) = scene_data.get_mut(scene_idx) {
                // Character name collection (special case, not a tag)
                if lt == crate::types::LineType::Character || lt == crate::types::LineType::DualDialogueCharacter {
                    let mut name = crate::layout::strip_sigils(line, lt).trim().to_string();
                    if let Some(idx) = name.find('(') { name = name[..idx].trim().to_string(); }
                    if !name.is_empty() { s.cast.insert(name.to_uppercase()); }
                }

                // Tag extraction
                let mut start_search = 0;
                while let Some(start) = line[start_search..].find("[[") {
                    let abs_start = start_search + start;
                    if let Some(end) = line[abs_start..].find("]]") {
                        let abs_end = abs_start + end;
                        let content = &line[abs_start + 2..abs_end];
                        if let Some((key, val)) = content.split_once(':') {
                            let key = key.trim().to_uppercase();
                            let values: Vec<_> = val.split(',').map(|v| v.trim()).filter(|v| !v.is_empty()).collect();
                            for v in values {
                                match key.as_str() {
                                    "CAST" => { s.cast.insert(v.to_uppercase()); }
                                    "PROPS" => { s.props.insert(v.to_string()); }
                                    "VFX" => { s.vfx.insert(v.to_string()); }
                                    "SFX" => { s.sfx.insert(v.to_string()); }
                                    "WARDROBE" => { s.wardrobe.insert(v.to_string()); }
                                    "MAKEUP" => { s.makeup.insert(v.to_string()); }
                                    "MUSIC" => { s.music.insert(v.to_string()); }
                                    _ => { s.tags.insert(format!("{}:{}", key, v)); }
                                }
                            }
                        }
                        start_search = abs_end + 2;
                    } else { break; }
                }
            }
        }

        // Final CSV generation
        for s in scene_data {
            let escape_csv = |set: &std::collections::BTreeSet<String>| -> String {
                let joined = set.iter().cloned().collect::<Vec<_>>().join(", ");
                joined.replace("\"", "\"\"")
            };

            csv.push_str(&format!(
                "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
                s.num, s.int_ext, s.location, s.time, s.length,
                escape_csv(&s.cast), escape_csv(&s.props), escape_csv(&s.vfx), escape_csv(&s.sfx),
                escape_csv(&s.wardrobe), escape_csv(&s.makeup), escape_csv(&s.music), escape_csv(&s.tags)
            ));
        }

        std::fs::write(path, csv)
    }

    pub fn export_dialogue_txt(&self, path: &std::path::Path) -> std::io::Result<()> {
        let mut out = String::new();
        let mut in_scene = false;

        for row in &self.layout {
            match row.line_type {
                crate::types::LineType::SceneHeading => {
                    let mut label = crate::layout::strip_sigils(&row.raw_text, row.line_type).to_string();
                    while let Some(s) = label.find("[[") {
                        if let Some(e) = label[s..].find("]]") { label.replace_range(s..s+e+2, ""); } else { break; }
                    }
                    let label = label.trim().to_uppercase();
                    if in_scene { out.push('\n'); }
                    out.push_str(&format!("═══ {} ═══\n\n", label));
                    in_scene = true;
                }
                crate::types::LineType::Character | crate::types::LineType::DualDialogueCharacter => {
                    let name = crate::layout::strip_sigils(&row.raw_text, row.line_type).trim().to_uppercase();
                    out.push_str(&format!("  {}\n", name));
                }
                crate::types::LineType::Parenthetical => {
                    let text = crate::layout::strip_sigils(&row.raw_text, row.line_type);
                    out.push_str(&format!("    {}\n", text.trim()));
                }
                crate::types::LineType::Dialogue => {
                    let text = crate::layout::strip_sigils(&row.raw_text, row.line_type);
                    out.push_str(&format!("      {}\n", text.trim()));
                }
                _ => {}
            }
        }
        std::fs::write(path, out)
    }

    pub fn set_error(&mut self, msg: &str) {
        self.status_msg = Some(msg.to_string());
        self.command_error = true;
    }

    pub fn get_revision_block(&self) -> String {
        let mut revs = Vec::new();
        for (i, &rev) in self.revised_lines.iter().enumerate() {
            if rev {
                revs.push(i.to_string());
            }
        }
        if revs.is_empty() && !self.revision_mode {
            return String::new();
        }
        format!(
            "\n/*\nFOUNT_REVISIONS: {}\nREVISION_MODE: {}\n*/",
            revs.join(", "),
            if self.revision_mode { "ON" } else { "OFF" }
        )
    }

    pub fn save(&mut self) -> io::Result<()> {
        if self.is_tutorial {
            self.set_status("Cannot save the tutorial buffer. Press Ctrl+X to exit.");
            return Ok(());
        }
        if let Some(ref p) = self.file {
            let mut content = self.lines.join("\n");
            if !content.ends_with('\n') {
                content.push('\n');
            }
            fs::write(p, content)?;
            self.dirty = false;
            self.set_status(&format!("Wrote {} lines", self.lines.len()));

            // Trigger snapshot on manual save
            self.trigger_snapshot();
            self.save_indicator_timer = Some(std::time::Instant::now());
        }
        Ok(())
    }
}
