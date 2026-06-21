use clap::Parser;
use crossterm::{
    event::{
        self, DisableBracketedPaste, DisableMouseCapture, EnableBracketedPaste, EnableMouseCapture,
        KeyboardEnhancementFlags, PopKeyboardEnhancementFlags, PushKeyboardEnhancementFlags,
    },
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use ratatui::{Terminal, backend::CrosstermBackend};
use std::{io, panic, time::Duration};

use fount::app::{App, ui::draw, FilePickerAction};
use fount::config::Cli;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    let default_panic = panic::take_hook();
    panic::set_hook(Box::new(move |info| {
        let mut stdout = io::stdout();
        let (_, rows) = crossterm::terminal::size().unwrap_or((0, 24));
        let _ = execute!(stdout, crossterm::cursor::MoveTo(0, rows));

        let _ = disable_raw_mode();
        let _ = execute!(
            stdout,
            crossterm::terminal::Clear(crossterm::terminal::ClearType::All),
            LeaveAlternateScreen,
            DisableMouseCapture,
            PopKeyboardEnhancementFlags,
            crossterm::cursor::Show
        );
        println!();
        default_panic(info);
    }));

    let mut app = App::new(cli);

    enable_raw_mode()?;
    let mut stdout = io::stdout();

    execute!(
        stdout,
        EnterAlternateScreen,
        EnableMouseCapture,
        EnableBracketedPaste,
    )?;

    // Keyboard enhancement might not be supported on all terminals (e.g. legacy Windows Console)
    if !app.config.legacy_windows {
        let _ = execute!(
            stdout,
            PushKeyboardEnhancementFlags(KeyboardEnhancementFlags::DISAMBIGUATE_ESCAPE_CODES)
        );
    }

    let backend = CrosstermBackend::new(stdout);
    let mut term = Terminal::new(backend)?;

    term.clear()?;

    let mut last_save = std::time::Instant::now();

    loop {
        term.draw(|f| draw(f, &mut app))?;

        let mut update_target_x = false;
        let mut text_changed = false;
        let mut cursor_moved = false;

        if event::poll(Duration::from_millis(100))? {
            let ev = event::read()?;
            if app.handle_event(
                ev,
                &mut update_target_x,
                &mut text_changed,
                &mut cursor_moved,
            )? {
                break;
            }

            while event::poll(Duration::from_millis(0))? {
                let next_ev = event::read()?;
                if app.handle_event(
                    next_ev,
                    &mut update_target_x,
                    &mut text_changed,
                    &mut cursor_moved,
                )? {
                    app.trigger_snapshot(); // Snapshot on exit
                    break;
                }
            }
        }

        if app.config.auto_save
            && app.dirty
            && last_save.elapsed() >= Duration::from_secs(app.config.auto_save_interval)
        {
            if app.file.is_some() {
                if let Err(e) = app.save() {
                    app.set_status(&format!("Auto-save failed: {}", e));
                } else {
                    app.set_status("Auto-saved");
                }
            } else if app.file_picker.is_none() {
                app.open_file_picker(
                    FilePickerAction::Save,
                    vec!["fountain".to_string()],
                    Some("unnamed.fountain".to_string()),
                );
                app.set_status("Please save the file first to enable Auto-save");
            }
            last_save = std::time::Instant::now();
        }

        // Periodic snapshots every 15 minutes if dirty
        let snapshot_interval = Duration::from_secs(900);
        let now = std::time::Instant::now();
        let last_snap = app.last_snapshot_time.unwrap_or(now.checked_sub(snapshot_interval).unwrap_or(now));
        if app.dirty && app.file.is_some() && now.duration_since(last_snap) >= snapshot_interval {
            app.trigger_snapshot();
        }

        app.check_goal();
        
        // Clear status message after 4 seconds
        if let Some(_timer) = app.status_timer.filter(|t| t.elapsed().as_secs() >= 4) {
            app.clear_status();
        }

        if text_changed {
            app.parse_document();
        }

        if text_changed || cursor_moved {
            app.update_autocomplete();
            app.update_layout();
        }

        if update_target_x {
            app.target_visual_x = app.current_visual_x();
        }
    }

    let (_, rows) = crossterm::terminal::size().unwrap_or((0, 24));

    disable_raw_mode()?;
    execute!(
        term.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture,
        DisableBracketedPaste,
    )?;
    if !app.config.legacy_windows {
        let _ = execute!(term.backend_mut(), PopKeyboardEnhancementFlags);
    }

    if std::env::var("TERM").unwrap_or_default() == "linux" {
        execute!(
            term.backend_mut(),
            crossterm::terminal::Clear(crossterm::terminal::ClearType::All),
            crossterm::cursor::MoveTo(0, rows)
        )?;
    }

    term.show_cursor()?;
    Ok(())
}
