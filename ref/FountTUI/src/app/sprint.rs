use std::{fs, io, path::PathBuf};
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use directories::ProjectDirs;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SprintRecord {
    pub project_name: String,
    pub timestamp: DateTime<Local>,
    pub duration_mins: u64,
    pub word_count: usize,
    pub line_count: usize,
}

pub struct SprintManager {
    path: PathBuf,
}

impl Default for SprintManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SprintManager {
    pub fn new() -> Self {
        let path = if let Some(proj_dirs) = ProjectDirs::from("", "", "Fount") {
            proj_dirs.data_dir().join("sprints.toml")
        } else {
            std::env::temp_dir().join("fount_sprints.toml")
        };
        
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        
        Self { path }
    }

    pub fn save_record(&self, record: SprintRecord) -> io::Result<()> {
        let mut records = self.get_records().unwrap_or_default();
        records.push(record);
        let wrapper = RecordsWrapper { sprints: records };
        let toml_str = toml::to_string(&wrapper).map_err(io::Error::other)?;
        fs::write(&self.path, toml_str)
    }

    pub fn get_records(&self) -> io::Result<Vec<SprintRecord>> {
        if !self.path.exists() {
            return Ok(Vec::new());
        }
        let content = fs::read_to_string(&self.path)?;
        let wrapper: RecordsWrapper = toml::from_str(&content).map_err(io::Error::other)?;
        Ok(wrapper.sprints)
    }

    pub fn export_csv(&self, destination: &PathBuf) -> io::Result<()> {
        let records = self.get_records()?;
        let mut csv = String::from("Project,Date,Duration (Mins),Word Count,Line Count\n");
        for r in records {
            csv.push_str(&format!(
                "\"{}\",\"{}\",{},{},{}\n",
                r.project_name.replace('\"', "\"\""),
                r.timestamp.format("%Y-%m-%d %H:%M:%S"),
                r.duration_mins,
                r.word_count,
                r.line_count
            ));
        }
        fs::write(destination, csv)
    }
}

#[derive(Serialize, Deserialize)]
struct RecordsWrapper {
    sprints: Vec<SprintRecord>,
}
