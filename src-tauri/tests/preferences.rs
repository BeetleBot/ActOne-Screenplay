mod tests {
    use actone_lib::app_prefs::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::{collections::HashMap, fs, path::PathBuf, sync::Mutex};
    use tauri::Manager;
    use tauri::{
        Listener,
        test::{mock_builder, mock_context, noop_assets},
    };
    static NEXT: AtomicU64 = AtomicU64::new(0);
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!(
                "actone-prefs-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir_all(&path).unwrap();
            Self(path)
        }
        fn file(&self) -> PathBuf {
            self.0.join("nested/actone-prefs.json")
        }
        fn app(&self) -> tauri::App<tauri::test::MockRuntime> {
            let app = mock_builder().build(mock_context(noop_assets())).unwrap();
            app.manage(PrefsStorage(self.file()));
            app.manage(AppPrefsState(Mutex::new(load_prefs(app.handle()))));
            app
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    fn prefs(values: &[(&str, &str)]) -> HashMap<String, String> {
        values
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn commands_persist_merge_and_reload_into_a_new_app() {
        let fixture = Fixture::new();
        let app = fixture.app();
        let (tx, rx) = std::sync::mpsc::channel();
        app.listen("app-prefs:changed", move |event| {
            tx.send(event.payload().to_string()).unwrap();
        });
        set_app_prefs(
            app.handle().clone(),
            app.state(),
            prefs(&[("theme", "light"), ("zoom", "100")]),
        )
        .unwrap();
        set_app_prefs(
            app.handle().clone(),
            app.state(),
            prefs(&[("theme", "dark"), ("font", "தமிழ்")]),
        )
        .unwrap();
        let expected = prefs(&[("theme", "dark"), ("zoom", "100"), ("font", "தமிழ்")]);
        assert_eq!(get_app_prefs(app.state()), expected);
        assert_eq!(load_prefs(app.handle()), expected);
        let events: Vec<_> = rx.try_iter().collect();
        assert_eq!(events.len(), 2);
        assert_eq!(
            serde_json::from_str::<HashMap<String, String>>(&events[1]).unwrap(),
            expected
        );
        drop(app);
        let reopened = fixture.app();
        assert_eq!(get_app_prefs(reopened.state()), expected);
    }

    #[test]
    fn missing_corrupt_and_wrongly_typed_files_load_safely_without_rewriting() {
        let fixture = Fixture::new();
        let app = fixture.app();
        assert!(load_prefs(app.handle()).is_empty());
        fs::create_dir_all(fixture.file().parent().unwrap()).unwrap();
        for bytes in [r#"{"theme": "dark""#, r#"{"zoom": 100}"#, "[]", "null"] {
            fs::write(fixture.file(), bytes).unwrap();
            assert!(load_prefs(app.handle()).is_empty());
            assert_eq!(fs::read_to_string(fixture.file()).unwrap(), bytes);
        }
        set_app_prefs(
            app.handle().clone(),
            app.state(),
            prefs(&[("theme", "recovered")]),
        )
        .unwrap();
        assert_eq!(load_prefs(app.handle()), prefs(&[("theme", "recovered")]));
    }

    #[test]
    fn failed_write_preserves_memory_and_emits_no_success_event() {
        let fixture = Fixture::new();
        let app = fixture.app();
        set_app_prefs(
            app.handle().clone(),
            app.state(),
            prefs(&[("theme", "light")]),
        )
        .unwrap();
        let original = fs::read(fixture.file()).unwrap();
        fs::remove_file(fixture.file()).unwrap();
        fs::create_dir(fixture.file()).unwrap();
        let (tx, rx) = std::sync::mpsc::channel();
        app.listen("app-prefs:changed", move |_| {
            tx.send(()).unwrap();
        });
        assert!(
            set_app_prefs(
                app.handle().clone(),
                app.state(),
                prefs(&[("theme", "dark")])
            )
            .is_err()
        );
        assert_eq!(get_app_prefs(app.state()), prefs(&[("theme", "light")]));
        assert!(rx.try_recv().is_err());
        fs::remove_dir(fixture.file()).unwrap();
        fs::write(fixture.file(), original).unwrap();
        assert_eq!(load_prefs(app.handle()), prefs(&[("theme", "light")]));
    }

    #[test]
    fn parent_creation_failure_is_returned_without_changing_state() {
        let fixture = Fixture::new();
        let app = fixture.app();
        fs::write(fixture.0.join("nested"), "not a directory").unwrap();
        assert!(
            set_app_prefs(
                app.handle().clone(),
                app.state(),
                prefs(&[("theme", "dark")])
            )
            .is_err()
        );
        assert!(get_app_prefs(app.state()).is_empty());
        assert_eq!(
            fs::read_to_string(fixture.0.join("nested")).unwrap(),
            "not a directory"
        );
    }

    #[test]
    fn concurrent_window_updates_keep_disk_and_memory_in_sync() {
        let fixture = Fixture::new();
        let app = fixture.app();
        let threads: Vec<_> = (0..8)
            .map(|i| {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    set_app_prefs(
                        handle.clone(),
                        handle.state(),
                        prefs(&[(&format!("window-{i}"), "saved")]),
                    )
                    .unwrap()
                })
            })
            .collect();
        for task in threads {
            task.join().unwrap();
        }
        let current = get_app_prefs(app.state());
        assert_eq!(current.len(), 8);
        assert_eq!(load_prefs(app.handle()), current);
    }
}
