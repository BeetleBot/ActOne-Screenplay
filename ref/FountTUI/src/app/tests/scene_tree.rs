use super::*;

#[test]
fn test_scene_tree_massive_nesting() {
    let mut app = create_empty_app();
    let mut lines = Vec::new();
    
    // Generate 100 sections, each with 10 scenes
    for i in 1..=100 {
        lines.push("".to_string());
        lines.push(format!("# Section {}", i));
        lines.push("= Synopsis for section".to_string());
        for j in 1..=10 {
            lines.push("".to_string());
            lines.push(format!("INT. SCENE {}-{}", i, j));
            lines.push("= Synopsis for scene".to_string());
            lines.push("Action line.".to_string());
        }
    }
    
    app.lines = lines;
    app.parse_document();
    app.update_layout();
    app.open_scene_tree();
    
    assert_eq!(app.scenes.len(), 100);
    
    for section in &app.scenes {
        assert!(section.is_section);
        assert_eq!(section.children.len(), 10);
    }
    
    let visible = app.get_visible_scenes();
    assert_eq!(visible.len(), 1100);
}

#[test]
fn test_scene_tree_collapse_stress() {
    let mut app = create_empty_app();
    let mut lines = Vec::new();
    
    for i in 1..=10 {
        lines.push("".to_string());
        lines.push(format!("# Section {}", i));
        for j in 1..=5 {
            lines.push("".to_string());
            lines.push(format!("INT. SCENE {}-{}", i, j));
        }
    }
    
    app.lines = lines;
    app.parse_document();
    app.update_layout();
    app.open_scene_tree();
    
    assert_eq!(app.get_visible_scenes().len(), 60);
    
    // Collapse all odd-indexed sections (0, 2, 4, 6, 8)
    for i in (0..10).step_by(2) {
        let line_idx = app.scenes[i].line_idx;
        app.collapsed_sections.insert(line_idx);
    }
    
    // 5 sections expanded (5 sections + 25 scenes = 30)
    // 5 sections collapsed (5 sections = 5)
    // Total: 35 items
    let visible = app.get_visible_scenes();
    assert_eq!(visible.len(), 35);
}

#[test]
fn test_scene_tree_navigation_stress() {
    let mut app = create_empty_app();
    let mut lines = Vec::new();
    for i in 1..=50 {
        lines.push("".to_string());
        lines.push(format!("INT. SCENE {}", i));
    }
    app.lines = lines;
    app.parse_document();
    app.update_layout();
    app.open_scene_tree();
    
    app.selected_scene = 0;
    
    let visible_count = app.get_visible_scenes().len();
    assert_eq!(visible_count, 50);

    // Simulate "Down" key press
    for _ in 0..100 { // Way more than needed
        if app.selected_scene < visible_count - 1 {
            app.selected_scene += 1;
        }
    }
    
    assert_eq!(app.selected_scene, 49);
}

#[test]
fn test_scene_tree_orphaned_scenes() {
    let mut app = create_empty_app();
    app.lines = vec![
        "INT. ORPHAN 1".to_string(),
        "".to_string(),
        "# SECTION 1".to_string(),
        "".to_string(),
        "INT. CHILD 1".to_string(),
        "".to_string(),
        "INT. ORPHAN 2".to_string(), 
    ];
    app.parse_document();
    app.update_layout();
    app.open_scene_tree();
    
    // Currently, our tree building logic (analysis.rs:81) treats ANY new heading
    // as a child if a section is open.
    // So "INT. ORPHAN 2" will likely become a child of SECTION 1.
    // Let's verify this behavior.
    
    assert_eq!(app.scenes.len(), 2);
    assert_eq!(app.scenes[0].label, "INT. ORPHAN 1");
    assert_eq!(app.scenes[1].label, "SECTION 1");
    assert_eq!(app.scenes[1].children.len(), 2); // Child 1 and Orphan 2
}
