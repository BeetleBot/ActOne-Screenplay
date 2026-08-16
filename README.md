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

## License

ActOne Screenplay is copyright Iyal Inc. All rights reserved. See [LICENSE](LICENSE) for the current commercial license terms.

Project website: <https://iyal.ink/actone/>
