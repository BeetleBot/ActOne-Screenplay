use super::*;
use crate::app::AppMode;

#[test]
fn test_ten_page_screenplay_complexity() {
    let mut script = String::new();
    
    // Metadata
    script.push_str("Title: THE GREAT INTEGRATION\n");
    script.push_str("Author: Fount Test Suite\n");
    script.push_str("Draft date: 2026-05-14\n\n");

    // Generate ~40 scenes to simulate ~10 pages (approx 1 scene per quarter page)
    for i in 1..=40 {
        script.push_str(&format!("# Section {}\n\n", i));
        script.push_str(&format!("= Synopsis for scene {}\n\n", i));
        
        let time = if i % 2 == 0 { "DAY" } else { "NIGHT" };
        script.push_str(&format!("INT. LOCATION {} - {}\n\n", i, time));
        
        script.push_str("Action line describing the setting and the character's movement through the space. ");
        script.push_str("It needs to be long enough to wrap across multiple lines in the editor view to test layout logic. ");
        script.push_str("/* This is a boneyard note inside an action line to test parser resilience. */\n\n");
        
        script.push_str("CHARACTER ONE\n");
        script.push_str("(thoughtful)\n");
        script.push_str(&format!("This is dialogue for scene {}. It contains **bold** and *italic* formatting to test the inline renderer. ", i));
        script.push_str("We should also test ~lyrics inside a scene to make sure they are handled correctly.\n\n");
        
        script.push_str("~Song line one\n");
        script.push_str("~Song line two\n\n");
        
        script.push_str("CHARACTER TWO\n");
        script.push_str("I agree with your assessment. [[This is an inline note.]]\n\n");
        
        script.push_str("> CENTERED TRANSITION <\n\n");
        
        if i % 10 == 0 {
            script.push_str("CUT TO:\n\n");
        }
    }
    
    script.push_str("> FADE OUT\n");
    script.push_str("THE END\n");

    let mut app = create_empty_app();
    app.lines = script.lines().map(|s| s.to_string()).collect();
    
    // 1. Test Parsing Speed and Success
    let start = std::time::Instant::now();
    app.parse_document();
    app.update_layout();
    let duration = start.elapsed();
    
    println!("Parsed 10-page script in {:?}", duration);
    assert!(duration.as_millis() < 500, "Parsing 10 pages took too long: {:?}", duration);

    // 2. Verify Scene Count
    assert_eq!(app.locations.len(), 40, "Should have 40 locations");
    assert!(app.index_cards.len() >= 80, "Should have sections and scenes in index cards");

    // 3. Verify X-Ray Data
    app.mode = AppMode::XRay;
    app.compute_xray(); 
    assert!(app.xray_data.is_some(), "X-Ray should have analyzed scenes");
    
    // 4. Verify Search/Navigation
    app.search_query = "LOCATION 25".to_string();
    app.update_search_regex();
    assert!(!app.search_matches.is_empty(), "Should find 'LOCATION 25'");
    
    // 5. Test Word Count
    let wc = app.total_word_count();
    assert!(wc > 2000, "10-page script should have > 2000 words, got {}", wc);

    // 6. Test Memory/Stability under "edits"
    // Append another 5 scenes
    for i in 41..=45 {
        app.lines.push("".to_string());
        app.lines.push(format!("INT. NEW LOCATION {} - DAY", i));
        app.lines.push("".to_string());
        app.lines.push("Final action.".to_string());
        app.lines.push("".to_string());
    }
    app.parse_document();
    app.update_layout();
    assert_eq!(app.locations.len(), 45, "Should have 45 locations after edit");
}
