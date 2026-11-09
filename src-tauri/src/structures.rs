use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct StructureBeat {
    pub label: String,
    pub description: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Structure {
    pub name: String,
    pub description: String,
    pub beats: Vec<StructureBeat>,
}

#[tauri::command]
pub fn get_structures() -> Vec<Structure> {
    let contents = [
        include_str!("../assets/structures/three-act_structure.fountain"),
        include_str!("../assets/structures/save_the_cat.fountain"),
        include_str!("../assets/structures/the_hero’s_journey.fountain"),
        include_str!("../assets/structures/the_story_circle.fountain"),
        include_str!("../assets/structures/freytags_pyramid.fountain"),
        include_str!("../assets/structures/john_trubys_7_key_steps.fountain"),
        include_str!("../assets/structures/michael_hauges_6_stage_journey.fountain"),
        include_str!("../assets/structures/the_sequence_approach.fountain"),
    ];

    let mut structures = Vec::new();
    for content in contents {
        structures.extend(parse_structures(content));
    }
    structures
}

#[tauri::command]
pub fn get_structure_template(name: String) -> String {
    match name.as_str() {
        "Three-Act Structure" => include_str!("../assets/structures/three-act_structure.fountain"),
        "Save the Cat" => include_str!("../assets/structures/save_the_cat.fountain"),
        "The Hero’s Journey" => include_str!("../assets/structures/the_hero’s_journey.fountain"),
        "The Story Circle" => include_str!("../assets/structures/the_story_circle.fountain"),
        "Freytag's Pyramid" => include_str!("../assets/structures/freytags_pyramid.fountain"),
        "John Truby's 7 Key Steps" => {
            include_str!("../assets/structures/john_trubys_7_key_steps.fountain")
        }
        "Michael Hauge's 6 Stage Journey" => {
            include_str!("../assets/structures/michael_hauges_6_stage_journey.fountain")
        }
        "The Sequence Approach" => {
            include_str!("../assets/structures/the_sequence_approach.fountain")
        }
        _ => "",
    }
    .to_string()
}

fn parse_structures(content: &str) -> Vec<Structure> {
    let mut structures = Vec::new();
    let mut current_struct: Option<Structure> = None;
    let mut current_beat: Option<StructureBeat> = None;

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        if let Some(rest) = line.strip_prefix('#') {
            let rest = rest.trim_start();
            if current_struct.is_none() {
                // First '#' is the structure name
                current_struct = Some(Structure {
                    name: rest.to_string(),
                    description: String::new(),
                    beats: Vec::new(),
                });
            } else {
                // Subsequent '#' are beats
                if let (Some(beat), Some(s)) = (current_beat.take(), current_struct.as_mut()) {
                    s.beats.push(beat);
                }
                current_beat = Some(StructureBeat {
                    label: rest.to_string(),
                    description: String::new(),
                });
            }
        } else if let Some(rest) = line.strip_prefix('=') {
            let rest = rest.trim_start();
            let desc = rest.to_string();
            if let Some(ref mut beat) = current_beat {
                if beat.description.is_empty() {
                    beat.description = desc;
                } else {
                    beat.description.push(' ');
                    beat.description.push_str(&desc);
                }
            } else if let Some(ref mut s) = current_struct {
                if s.description.is_empty() {
                    s.description = desc;
                } else {
                    s.description.push(' ');
                    s.description.push_str(&desc);
                }
            }
        }
    }

    if let (Some(beat), Some(s)) = (current_beat.take(), current_struct.as_mut()) {
        s.beats.push(beat);
    }
    if let Some(s) = current_struct.take() {
        structures.push(s);
    }

    structures
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_custom_structure() {
        let sample = r#"
# Detective Mystery
= Standard 4-part whodunit structure.

# The Crime
= A body is discovered in the locked study.

# The Clues
= Multiple suspects are interrogated.
= Contradictory alibis emerge.

# The Revelation
= The detective gathers everyone in the library.
"#;
        let structs = parse_structures(sample);
        assert_eq!(structs.len(), 1);
        let s = &structs[0];
        assert_eq!(s.name, "Detective Mystery");
        assert_eq!(s.description, "Standard 4-part whodunit structure.");
        assert_eq!(s.beats.len(), 3);
        assert_eq!(s.beats[0].label, "The Crime");
        assert_eq!(s.beats[0].description, "A body is discovered in the locked study.");
        assert_eq!(s.beats[1].label, "The Clues");
        assert_eq!(s.beats[1].description, "Multiple suspects are interrogated. Contradictory alibis emerge.");
    }

    #[test]
    fn test_get_structures_loads_builtin_templates() {
        let all = get_structures();
        assert!(all.len() >= 8, "Expected at least 8 built-in structures, got {}", all.len());
        let names: Vec<&str> = all.iter().map(|s| s.name.as_str()).collect();
        assert!(names.contains(&"Three-Act Structure") || names.iter().any(|n| n.contains("Three-Act")));
        assert!(names.iter().any(|n| n.contains("Save the Cat") || n.contains("Save The Cat")));
    }

    #[test]
    fn test_get_structure_template_match() {
        let save_cat = get_structure_template("Save the Cat".to_string());
        assert!(!save_cat.is_empty(), "Save the Cat template must not be empty");

        let unknown = get_structure_template("Unknown Nonexistent Structure".to_string());
        assert!(unknown.is_empty(), "Unknown template must return empty string");
    }
}
