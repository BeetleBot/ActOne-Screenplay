use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MetadataEntry {
    pub key: String,
    pub values: Vec<String>,
    pub line_idx: usize,
}

#[derive(Debug, Clone, Default)]
pub struct MetadataStore {
    /// Maps Scene index (from app.index_cards) to a list of metadata entries.
    pub scene_metadata: HashMap<usize, Vec<MetadataEntry>>,
    
    /// Global list of unique assets for quick lookup (e.g., list of all props).
    pub global_assets: HashMap<String, Vec<String>>,
}

impl MetadataStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn clear(&mut self) {
        self.scene_metadata.clear();
        self.global_assets.clear();
    }

    pub fn add_entry(&mut self, scene_idx: usize, key: String, values: Vec<String>, line_idx: usize) {
        let entry = MetadataEntry {
            key: key.clone(),
            values: values.clone(),
            line_idx,
        };
        
        self.scene_metadata.entry(scene_idx).or_default().push(entry);
        
        // Update global assets for specific keys
        if matches!(key.as_str(), "props" | "cast" | "wardrobe" | "makeup" | "sfx" | "vfx" | "music") {
            let assets = self.global_assets.entry(key).or_default();
            for val in values {
                if !assets.contains(&val) {
                    assets.push(val);
                }
            }
            assets.sort();
        }
    }

    pub fn get_scene_metadata(&self, scene_idx: usize) -> Option<&Vec<MetadataEntry>> {
        self.scene_metadata.get(&scene_idx)
    }
}
