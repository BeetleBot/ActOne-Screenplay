use std::io;
use std::fs;
use crate::app::{App, AppMode};

impl App {
    pub fn open_snapshots(&mut self) {
        if let Some(ref p) = self.file {
            self.snapshots = self.snapshot_manager.list_snapshots(p);
            if self.snapshots.is_empty() {
                self.set_status("No snapshots found for this file.");
            } else {
                self.mode = AppMode::Snapshots;
                self.snapshot_list_state.select(Some(0));
            }
        } else {
            self.set_error("Save the file first to use snapshots.");
        }
    }

    pub fn trigger_snapshot(&mut self) {
        if let Some(ref p) = self.file {
            if let Err(e) = self.snapshot_manager.create_snapshot(p, &self.lines) {
                self.set_status(&format!("Snapshot failed: {}", e));
            } else {
                self.last_snapshot_time = Some(std::time::Instant::now());
            }
        }
    }

    pub fn restore_snapshot(&mut self, index: usize, in_new_buffer: bool) -> io::Result<()> {
        if index >= self.snapshots.len() {
            return Ok(());
        }

        let snapshot_path = self.snapshots[index].path.clone();
        let snapshot_display_time = self.snapshots[index].display_time();
        let content = fs::read_to_string(&snapshot_path)?;

        let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
        if lines.is_empty() {
            lines = vec![String::new()];
        }

        let buf_name = if let Some(ref p) = self.file {
            p.file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_else(|| "unnamed".to_string())
        } else {
            "unnamed".to_string()
        };

        if in_new_buffer {
            let revised_lines = vec![false; lines.len()];
            let new_buf = crate::app::BufferState {
                lines,
                dirty: true,
                revised_lines,
                ..Default::default()
            };
            self.buffers.push(new_buf);
            let new_idx = self.buffers.len() - 1;
            self.has_multiple_buffers = true;
            self.switch_buffer(new_idx);
            self.set_status(&format!(
                "Opened snapshot of {} from {} in a new buffer",
                buf_name, snapshot_display_time
            ));
        } else {
            self.save_state(true); // Save current for undo
            self.revised_lines = vec![false; lines.len()];
            self.lines = lines;
            self.cursor_y = 0;
            self.cursor_x = 0;
            self.dirty = true;
            self.parse_document();
            self.update_autocomplete();
            self.update_layout();
            self.set_status(&format!(
                "Replaced current buffer with snapshot from {}",
                snapshot_display_time
            ));
        }

        self.mode = AppMode::Normal;
        Ok(())
    }
}
