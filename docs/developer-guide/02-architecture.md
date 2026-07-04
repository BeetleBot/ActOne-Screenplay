# Architecture Overview

ActOne is a cross-platform desktop screenplay editor built with **Tauri v2** (Rust backend) + **React 19** + **TypeScript** (frontend). The editor is powered by **CodeMirror 6** with custom Fountain screenplay syntax highlighting. PDF generation uses **krilla** + **cosmic-text** for professional-grade layout.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Tauri Desktop Shell                │
│  ┌───────────────────────────────────────────────┐  │
│  │           React Frontend (WebView)             │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │   MUI   │ │CodeMirror│ │  Zustand-like  │  │  │
│  │  │Components│ │  6 Editor│ │  Contexts     │  │  │
│  │  └─────────┘ └──────────┘ └───────────────┘  │  │
│  │         │         │              │            │  │
│  │         └─────────┼──────────────┘            │  │
│  │                   │ invoke() / events          │  │
│  └───────────────────┼───────────────────────────┘  │
│                      │ Tauri IPC                    │
│  ┌───────────────────┼───────────────────────────┐  │
│  │           Rust Backend                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │Commands  │ │ PDF      │ │ Font Cache   │  │  │
│  │  │(30+ IPC) │ │ Engine   │ │ App Prefs    │  │  │
│  │  └──────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Directory Structure

```
ActOneCode/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component
│   ├── components/               # UI components
│   │   ├── layout/               # Shell layout (HeaderBar, ActivityBar, StatusBar)
│   │   ├── FountainEditor.tsx    # Editor shell
│   │   └── ...                   # Feature components
│   ├── context/                  # State management (React Context)
│   ├── editor/                   # CodeMirror 6 integration
│   ├── parser/                   # Fountain parser (frontend)
│   ├── theme/                    # Theming system
│   ├── hooks/                    # Custom hooks
│   ├── utils/                    # Utilities
│   ├── data/                     # Static data (help articles)
│   └── types/                    # TypeScript type definitions
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Main module (all Tauri commands)
│   │   ├── main.rs               # Entry point
│   │   ├── pdf/                  # PDF generation pipeline
│   │   │   ├── mod.rs            # Public API
│   │   │   ├── export/           # Rendering (pdf.rs, elements.rs, layout.rs, title_page.rs)
│   │   │   ├── parser/           # Rust-side Fountain parser
│   │   │   ├── rich_string/      # RichText with bold/italic/underline
│   │   │   ├── fdx.rs            # Final Draft XML export
│   │   │   ├── fadein.rs         # FadeIn format export
│   │   │   └── fadein_pack.rs    # FadeIn ZIP packaging
│   │   ├── font_cache.rs         # Font detection/caching
│   │   ├── app_prefs.rs          # Application preferences
│   │   ├── snapshots.rs          # File snapshot system
│   │   └── structures.rs         # Story structure templates
│   ├── Cargo.toml
│   └── tauri.conf.json
├── Release/                      # Build scripts
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Multi-Window Architecture

ActOne uses Tauri's multi-webview capability. The main window launches an editor; modal windows (Settings, Help, Tag Manager, Theme Manager, X-Ray) open as separate Tauri WebviewWindows. Communication between windows happens via Tauri's `emit`/`listen` event system and shared `invoke()` calls to the Rust backend.

| Window | ID | Purpose |
|--------|----|---------|
| Welcome | `welcome` | Initial landing (600x540, no decorations) |
| Editor | `main` | Full screenplay editor |
| Settings | `settings` | App settings modal |
| Help | `help` | Help guide (47 articles) |
| Tag Manager | `tag-manager` | Scene tag management |
| Theme Manager | `theme-manager` | Custom theme editor |
| X-Ray | `xray` | Screenplay analysis tools |
