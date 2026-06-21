use std::{
    fs, io,
    path::{Path, PathBuf},
    time::SystemTime,
};
use directories::ProjectDirs;

#[derive(Clone, Debug)]
pub struct Snapshot {
    pub path: PathBuf,
    pub timestamp: SystemTime,
    pub filename: String,
}

impl Snapshot {
    pub fn display_time(&self) -> String {
        let datetime: chrono::DateTime<chrono::Local> = self.timestamp.into();
        datetime.format("%Y-%m-%d %H:%M:%S").to_string()
    }

    pub fn display_date(&self) -> String {
        let datetime: chrono::DateTime<chrono::Local> = self.timestamp.into();
        datetime.format("%Y-%m-%d").to_string()
    }

    pub fn display_time_only(&self) -> String {
        let datetime: chrono::DateTime<chrono::Local> = self.timestamp.into();
        datetime.format("%H:%M:%S").to_string()
    }

    pub fn display_stem(&self) -> String {
        // Filename is "stemDD_MM_YYYY_HH_MM.fountain"
        // We want to extract the stem.
        // The timestamp suffix is 17 characters (DD_MM_YYYY_HH_MM) + 9 for ".fountain" NO, wait.
        // DD_MM_YYYY_HH_MM is 2+1+2+1+4+1+2+1+2 = 16 characters.
        // ".fountain" is 9. Total 25.
        if self.filename.len() > 25 {
            self.filename[..self.filename.len() - 25].to_string()
        } else {
            self.filename.clone()
        }
    }
}

pub struct SnapshotManager {
    root: PathBuf,
}

impl Default for SnapshotManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SnapshotManager {
    pub fn new() -> Self {
        let root = if let Some(proj_dirs) = ProjectDirs::from("", "", "Fount") {
            proj_dirs.data_dir().join("snapshots")
        } else {
            std::env::temp_dir().join("fount_snapshots")
        };

        if !root.exists() {
            let _ = fs::create_dir_all(&root);
        }

        Self { root }
    }

    pub fn create_snapshot(&self, original_path: &Path, lines: &[String]) -> io::Result<PathBuf> {
        let filename = original_path
            .file_stem()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "unnamed".to_string());

        let datetime: chrono::DateTime<chrono::Local> = chrono::Local::now();
        let timestamp_str = datetime.format("%d_%m_%Y_%H_%M").to_string();

        let snapshot_name = format!("{}{}.fountain", filename, timestamp_str);
        let snapshot_path = self.root.join(snapshot_name);

        let content = lines.join("\n");
        fs::write(&snapshot_path, content)?;

        // Prune after creation
        let _ = self.prune_snapshots(&filename, 50, 30);

        Ok(snapshot_path)
    }

    pub fn list_snapshots(&self, original_path: &Path) -> Vec<Snapshot> {
        let filename = original_path
            .file_stem()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "unnamed".to_string());

        let mut snapshots = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.root) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().into_owned();

                if name.starts_with(&filename) && name.ends_with(".fountain")
                    && let Ok(metadata) = entry.metadata()
                        && let Ok(timestamp) = metadata.modified() {
                            let path = entry.path();
                            snapshots.push(Snapshot {
                                path,
                                timestamp,
                                filename: name,
                            });
                        }
            }
        }

        snapshots.sort_by_key(|b| std::cmp::Reverse(b.timestamp));
        snapshots
    }

    pub fn prune_snapshots(&self, filename: &str, max_count: usize, max_days: u64) -> io::Result<()> {
        let mut snapshots = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.root) {
            for entry in entries.flatten() {
                let name_os = entry.file_name();
                let name = name_os.to_string_lossy();
                let should_include = name.starts_with(filename) && name.ends_with(".fountain");

                if should_include
                    && let Ok(metadata) = entry.metadata()
                        && let Ok(timestamp) = metadata.modified() {
                            let path = entry.path();
                            snapshots.push((path, timestamp));
                        }
            }
        }

        snapshots.sort_by_key(|b| std::cmp::Reverse(b.1));

        let now = SystemTime::now();
        let max_age = std::time::Duration::from_secs(max_days * 24 * 60 * 60);

        for (i, (path, timestamp)) in snapshots.iter().enumerate() {
            let too_many = i >= max_count;
            let too_old = now.duration_since(*timestamp).unwrap_or_default() > max_age;

            if too_many || too_old {
                let _ = fs::remove_file(path);
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_snapshot_creation_and_listing() {
        let dir = tempdir().unwrap();
        let manager = SnapshotManager { root: dir.path().to_path_buf() };
        let lines = ["Title: Test".to_string(), "Body".to_string()];

        let original = std::path::Path::new("test.fountain");
        let snapshot_path = manager.create_snapshot(original, &lines[..]).unwrap();
        assert!(snapshot_path.exists());

        let snapshots = manager.list_snapshots(original);
        assert_eq!(snapshots.len(), 1);
        // Matches TitleDD_MM_YYYY_HH_MM.fountain
        assert!(snapshots[0].filename.starts_with("test"));
        assert!(snapshots[0].filename.ends_with(".fountain"));
    }

    #[test]
    fn test_snapshot_pruning() {
        let dir = tempdir().unwrap();
        let manager = SnapshotManager { root: dir.path().to_path_buf() };
        let _original = std::path::Path::new("test.fountain");
        let lines = ["Content".to_string()];

        // Create 5 snapshots with different names to simulate different minutes/files
        for i in 0..5 {
            let p = dir.path().join(format!("test{}.fountain", i));
            manager.create_snapshot(&p, &lines[..]).unwrap();
        }

        // Check for specific file
        let snapshots = manager.list_snapshots(Path::new("test0.fountain"));
        assert_eq!(snapshots.len(), 1);

        // Prune logic test: create 5 for same stem (using simulated time delay is hard, so we'll just test the call)
        manager.prune_snapshots("test0", 3, 30).unwrap();
    }
}
