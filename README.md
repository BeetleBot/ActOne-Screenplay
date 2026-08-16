# ActOne Screenplay

ActOne is a native screenplay editor for Windows and Linux. It uses Fountain text, provides a focused writing environment, and stores projects in portable `.actone` bundles.

## Features

- Fountain editing with live syntax highlighting
- Character, scene, location, and transition autocomplete
- Keyboard-driven formatting and scene navigation
- Outline view with sections, synopses, scene colors, and storylines
- Multi-script `.actone` projects
- Local snapshots stored in each project's `.snapshots/` directory
- Optional offline spellcheck with downloadable dictionaries
- Import from Final Draft (`.fdx`), Fade In (`.fadein`), Fountain, text, and `.spmd`
- Export to PDF, FDX, Fade In, Fountain, and CSV
- Title page editor and structure templates
- X-Ray screenplay analysis
- Writing sprints, tasks, markers, parking, and notepad tools
- Custom themes and interface scaling
- Optional Muse AI support for Ollama and OpenAI-compatible providers

## Screenshots

| | |
|---|---|
| ![Fountain Screenplay Editor](https://iyal.ink/assets/website%20images/A1-Editor.png)<br>**Editor** – live Fountain formatting, autocomplete, and scene navigation | ![Outline Navigator](https://iyal.ink/assets/website%20images/A1-Navigator.png)<br>**Outline navigator** – sections, synopses, scene colors, and storylines |
| ![Multi Script Projects](https://iyal.ink/assets/website%20images/A1-Multi-Scripts.png)<br>**Multi-script projects** – `.actone` bundles with notes, character lists, and progress | ![Snapshots](https://iyal.ink/assets/website%20images/A1snapshot.png)<br>**Snapshots** – automatic version history with diffs and restore |
| ![X-Ray Analytics](https://iyal.ink/assets/website%20images/A1-Xray.png)<br>**X-Ray** – screenplay analysis and statistics | ![Muse AI Assistant](https://iyal.ink/assets/website%20images/A1-Muse.png)<br>**Muse** – optional AI writing assistant (Ollama or OpenAI-compatible) |
| ![Export Dialog](https://iyal.ink/assets/website%20images/A1-Export.png)<br>**Export** – PDF, Final Draft (FDX), Fade In, Fountain, and CSV | |

## Download

Download the latest Windows and Linux builds from:

<https://iyal.ink/actone/downloads/>

## Documentation

- User and developer documentation: <https://iyal.ink/actone/docs/>
- Fountain syntax: <https://fountain.io/>
- In-app help: press `F1` or open Help from the application

## Development

### Requirements

- Node.js
- Rust and Cargo
- Tauri prerequisites for your operating system

### Install dependencies

```bash
npm install
```

### Run the frontend

```bash
npm run dev
```

### Run the desktop application

```bash
npm run tauri dev
```

### Verify changes

```bash
npm run typecheck
npm test
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

### Build

```bash
npm run build
```

## Project Structure

```text
src/                 React and TypeScript frontend
src-tauri/           Rust backend and Tauri commands
docs/                Feature, developer, and API documentation
Release/             Packaging and release scripts
Test-Files/          Sample files and test projects
```

## File Formats

ActOne reads and writes Fountain text and `.actone` project bundles. An `.actone` file is a ZIP-based project archive containing screenplay text and project metadata. Keep regular backups of important work when experimenting with development builds.

## Contributing

Before opening an issue or pull request:

1. Search existing issues and documentation.
2. Reproduce the problem with the latest build.
3. Include the operating system, app version, reproduction steps, and relevant logs.
4. Run the frontend and Rust test commands listed above.

## AI Development Clarification

- **Was this app "Vibe Coded"?** No.
- **Was this app completely developed by AI?** No, but AI assistance was used to create it.
- **So what is it?** ActOne is developed by a full-time writer with working knowledge of Rust and TypeScript. As a writer, he cannot dedicate all his time to the app itself, so AI handled some of the mundane and fine-tuning tasks. The architecture of the app's backend is completely designed by him, and the core engine is written completely by him, with inspiration drawn from other projects and open-source work.
- **What did AI handle?** The documentation, some UI elements, comments across all the files, the changelog files, and some complicated pieces of code that he couldn't handle himself.

## License

ActOne Screenplay is licensed under the [MIT License](LICENSE).

Project website: <https://iyal.ink/actone/>
