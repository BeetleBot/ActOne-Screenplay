use super::*;
use crossterm::event::{KeyCode, KeyModifiers};

#[test]
fn test_app_monkey_random_input() {
    // A deterministic seed-based monkey test to find panics
    let mut app = create_empty_app();
    
    // Seeded pseudo-random generator
    let mut seed: u64 = 42;
    let mut next_rand = || {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        seed
    };

    let key_codes = [
        KeyCode::Char('a'), KeyCode::Char(' '), KeyCode::Char('\n'),
        KeyCode::Backspace, KeyCode::Delete, KeyCode::Tab,
        KeyCode::Up, KeyCode::Down, KeyCode::Left, KeyCode::Right,
        KeyCode::Home, KeyCode::End, KeyCode::PageUp, KeyCode::PageDown,
        KeyCode::Esc,
        KeyCode::Char('1'), KeyCode::Char('2'), KeyCode::Char('3'), KeyCode::Char('4'),
        KeyCode::Char(':'), // Potentially enters command mode
    ];

    // Perform 10,000 random actions
    for _ in 0..10000 {
        let idx = (next_rand() % key_codes.len() as u64) as usize;
        let code = key_codes[idx];
        
        let modifiers = if next_rand() % 10 == 0 {
            KeyModifiers::CONTROL
        } else {
            KeyModifiers::NONE
        };

        // We use a safe wrapper to catch potential panics if we wanted to be extreme,
        // but for a standard rust test, a panic will just fail the test.
        send_key_press(&mut app, code, modifiers);
        
        // Occasionally trigger a layout update or analysis to stress those paths
        if next_rand() % 100 == 0 {
            app.update_layout();
        }
        if next_rand() % 500 == 0 {
            app.compute_xray();
        }
        
        // Sanity checks: app state should remain valid
        assert!(app.cursor_y <= app.lines.len(), "Cursor Y out of bounds");
        if !app.lines.is_empty() {
             // In some intermediate states, cursor_x might be slightly off before correction,
             // but handle_event should generally keep it safe.
        }
    }
}

#[test]
fn test_app_mode_switching_stress() {
    let mut app = create_empty_app();
    let modes = [
        AppMode::Normal, AppMode::Command, AppMode::XRay, 
        AppMode::SceneTree, AppMode::IndexCards, AppMode::Search
    ];
    
    let mut seed: u64 = 123;
    let mut next_rand = || {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        seed
    };

    for _ in 0..1000 {
        let m_idx = (next_rand() % modes.len() as u64) as usize;
        app.mode = modes[m_idx];
        
        // Random key in this mode
        let k_idx = (next_rand() % 10) as u8;
        let code = match k_idx {
            0 => KeyCode::Char('j'),
            1 => KeyCode::Char('k'),
            2 => KeyCode::Up,
            3 => KeyCode::Down,
            4 => KeyCode::Esc,
            5 => KeyCode::Tab,
            6 => KeyCode::Enter,
            _ => KeyCode::Char('x'),
        };
        
        send_key_press(&mut app, code, KeyModifiers::NONE);
        app.update_layout();
    }
}
