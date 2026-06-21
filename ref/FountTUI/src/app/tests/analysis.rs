use super::*;

#[test]
fn test_compute_xray_character_stats() {
    let mut app = create_empty_app();
    app.lines = vec![
        "INT. BAR - DAY".to_string(),
        "".to_string(), // Empty line required for character detection
        "BOB".to_string(),
        "Hello.".to_string(),
        "".to_string(),
        "ALICE".to_string(),
        "Hi.".to_string(),
        "".to_string(),
        "BOB".to_string(),
        "Bye.".to_string(),
    ];
    app.parse_document();
    app.update_layout(); 
    app.compute_xray();

    let data = app.xray_data.as_ref().expect("X-Ray data should be populated");
    
    let bob = data.characters.iter().find(|c| c.name == "BOB").unwrap();
    assert_eq!(bob.word_count, 2);
    assert_eq!(bob.dialogue_lines, 2);
}

#[test]
fn test_compute_xray_pacing_and_scenes() {
    let mut app = create_empty_app();
    app.lines = vec![
        "INT. ONE".to_string(),
        "".to_string(),
        "Action.".to_string(),
        "".to_string(),
        "EXT. TWO".to_string(),
        "".to_string(),
        "Action.".to_string(),
    ];
    app.parse_document();
    app.update_layout();
    app.compute_xray();

    let data = app.xray_data.as_ref().unwrap();
    assert_eq!(data.scenes.len(), 2);
}

#[test]
fn test_compute_xray_inventory_tags() {
    let mut app = create_empty_app();
    app.lines = vec![
        "INT. GARAGE - DAY".to_string(),
        "".to_string(),
        "He picks up a [[Prop:Wrench]].".to_string(),
        "".to_string(),
        "EXT. STREET - DAY".to_string(),
        "".to_string(),
        "A [[Vehicle:Red Car]] speeds by.".to_string(),
        "The driver wears a [[Wardrobe:Leather Jacket, Gloves]].".to_string(),
    ];
    app.parse_document();
    app.update_layout();
    app.compute_xray();

    let data = app.xray_data.as_ref().unwrap();
    assert!(data.global_breakdown.contains_key("PROP"));
}

#[test]
fn test_index_card_generation() {
    let mut app = create_empty_app();
    app.lines = vec![
        "# Section 1".to_string(),
        "".to_string(),
        ".SCENE 1".to_string(),
        "".to_string(),
        "# Section 2".to_string(),
        "".to_string(),
        ".SCENE 2".to_string(),
    ];
    app.parse_document();
    app.update_index_cards();
    
    assert_eq!(app.index_cards.len(), 4); 
    assert_eq!(app.index_cards[2].heading, "Section 2");
    // The dot is preserved in index cards if not stripped by specific regex
    assert_eq!(app.index_cards[3].heading, ".SCENE 2"); 
}

#[test]
fn test_xray_interaction_matrix() {
    let mut app = create_empty_app();
    app.lines = vec![
        "INT. BAR - NIGHT".to_string(),
        "".to_string(),
        "BOB".to_string(),
        "Hi.".to_string(),
        "".to_string(),
        "ALICE".to_string(),
        "Hello.".to_string(),
        "".to_string(),
        "INT. HOME - NIGHT".to_string(),
        "".to_string(),
        "BOB".to_string(),
        "I'm home.".to_string(),
        "".to_string(),
        "CHARLIE".to_string(),
        "Welcome.".to_string(),
    ];
    app.parse_document();
    app.update_layout();
    app.compute_xray();

    let data = app.xray_data.as_ref().unwrap();
    
    let ab_pair = if "ALICE" < "BOB" { ("ALICE".to_string(), "BOB".to_string()) } else { ("BOB".to_string(), "ALICE".to_string()) };
    assert_eq!(*data.interaction_matrix.get(&ab_pair).unwrap_or(&0), 1);
}

#[test]
fn test_index_card_movement() {
    let mut app = create_empty_app();
    app.lines = vec![
        ".SCENE 1".to_string(),
        "Synopsis 1".to_string(),
        "".to_string(),
        ".SCENE 2".to_string(),
        "Synopsis 2".to_string(),
        "".to_string(),
        ".SCENE 3".to_string(),
        "Synopsis 3".to_string(),
    ];
    app.parse_document();
    app.update_index_cards();
    
    assert_eq!(app.index_cards.len(), 3);
    assert_eq!(app.index_cards[0].heading, ".SCENE 1");
    assert_eq!(app.index_cards[1].heading, ".SCENE 2");
    assert_eq!(app.index_cards[2].heading, ".SCENE 3");

    app.mode = AppMode::IndexCards;
    app.selected_card_idx = 1;

    // Move Card 2 to the Left (swap with Card 1)
    send_key_press(&mut app, KeyCode::Left, KeyModifiers::SHIFT);

    // Validate state
    assert_eq!(app.selected_card_idx, 0);
    assert!(app.card_is_moving);
    
    // Check headings after layout update
    assert_eq!(app.index_cards[0].heading, ".SCENE 2");
    assert_eq!(app.index_cards[1].heading, ".SCENE 1");

    // Move Card 2 to the Right (swap with Card 1 again)
    send_key_press(&mut app, KeyCode::Right, KeyModifiers::SHIFT);
    assert_eq!(app.selected_card_idx, 1);
    assert!(app.card_is_moving);
    assert_eq!(app.index_cards[0].heading, ".SCENE 1");
    assert_eq!(app.index_cards[1].heading, ".SCENE 2");

    // Clear card_is_moving state on standard navigation key press without shift
    send_key_press(&mut app, KeyCode::Right, KeyModifiers::empty());
    assert!(!app.card_is_moving);
}
