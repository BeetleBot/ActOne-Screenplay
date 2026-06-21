use crate::app::sprint;
use crate::app::{App, GoalType};
use std::time::{Duration, Instant};

impl App {
    pub fn check_goal(&mut self) {
        if let Some(GoalType::Sprint {
            start_time,
            duration,
            start_words,
            start_lines,
        }) = self.active_goal
            && start_time.elapsed() >= duration
        {
                let current_words = self.total_word_count();
                let words_written = current_words.saturating_sub(start_words);
                let current_lines = self.lines.len();
                let lines_written = current_lines.saturating_sub(start_lines);

                // Save record
                let project_name = if let Some(path) = &self.file {
                    path.file_stem()
                        .map(|s| s.to_string_lossy().into_owned())
                        .unwrap_or_else(|| "unnamed".to_string())
                } else {
                    "unnamed".to_string()
                };

                let record = sprint::SprintRecord {
                    project_name,
                    timestamp: chrono::Local::now(),
                    duration_mins: duration.as_secs() / 60,
                    word_count: words_written,
                    line_count: lines_written,
                };
                let _ = self.sprint_manager.save_record(record);

                self.set_status(&format!(
                    "Sprint finished! You wrote {} words and {} lines.",
                    words_written, lines_written
                ));
                self.active_goal = None;
                self.flash_timer = Some(Instant::now());
            }

        // Handle flash timer
        if let Some(flash) = self.flash_timer
            && flash.elapsed() > Duration::from_millis(200)
        {
            self.flash_timer = None;
        }
    }
}
