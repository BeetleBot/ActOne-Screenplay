<div align="center">

  <img src="https://iyal.ink/assets/ActOne_apptile.png" alt="ActOne Logo" width="130">

  # ActOne Screenplay

  <p align="center">
    <a href="https://iyal.ink/actone/" style="text-decoration:none;">
      <img src="https://img.shields.io/badge/Website-iyal.ink%2Factone-10B981?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Official Website" />
    </a>
    &nbsp;
    <a href="https://iyal.ink/actone/docs/" style="text-decoration:none;">
      <img src="https://img.shields.io/badge/Docs-Documentation-8B5CF6?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Documentation" />
    </a>
    &nbsp;
    <a href="https://iyal.ink/actone/downloads/" style="text-decoration:none;">
      <img src="https://img.shields.io/badge/Download-App-10B981?style=for-the-badge" alt="Download ActOne" />
    </a>
  </p>

  <p align="center">
    Free & Open Source Fountain Screenplay Editor for Windows and Linux.
    <br>
    <i>GPLv3 • Built by <a href="https://iyal.ink">iyal.ink</a></i>
  </p>

</div>

---

### What is ActOne?

Mac writers have **Beat** and **Highland**. Windows and Linux writers needed a clean, native Fountain screenplay editor that just works without subscriptions, locked formats, or bloated interfaces.

**ActOne Screenplay** is a free, open source **Final Draft** and **Trelby** alternative for PC and Linux. Write in plain text using [Fountain](https://fountain.io/), organize your story with an outline tree, analyze your pacing with X-Ray analytics, and export production ready PDFs or `.fdx` files.

> ⌨️ **Prefer the terminal?** Check out **[FountTUI](https://fount.iyal.ink)**, our terminal Fountain screenplay editor built in Rust.

---

## 🎬 Features

### 01. Native Fountain Editing
Live syntax highlighting powered by CodeMirror 6. Automatic character autocomplete, Tab cycling for Fountain prefixes (`@`, `.`, `>`), and auto closing parentheticals.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Editor.png" width="850" alt="Fountain Screenplay Editor">
</p>

---

### 02. Outline Tree Navigator
Instantly navigate your script through a collapsible outline tree mapping sections (`#`), scene headers, and synopses (`=`). Visual plot arc markers let you track storylines at a glance.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Navigator.png" width="850" alt="Outline Tree Navigator">
</p>

---

### 03. Multi Script Projects (`.actone`)
Package multiple `.fountain` screenplay files, scratchpad notes, character lists, and progress data into a single `.actone` project folder. Files are saved as standard ZIP archives so your data is never locked in.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Multi-Scripts.png" width="850" alt="Multi Script Projects Workspace">
</p>

---

### 04. Local Version Snapshots
Automatic, interval, and save triggered local snapshots keep track of every revision. Compare diffs and restore previous drafts with a single click with no cloud required.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1snapshot.png" width="850" alt="Automatic Version Snapshots">
</p>

---

### 05. X-Ray Screenplay Analytics
Track dialogue to action ratios, day vs. night scene distributions, story pacing, and character co-occurrence connection graphs.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Xray.png" width="850" alt="X-Ray Screenplay Analytics">
</p>

---

### 06. Muse AI Writing Assistant
Optional AI assistant that connects to your local Ollama instance for 100% offline privacy, or external API keys. Use `@write-scene`, `@lookup`, and `@synonyms` in contextual chat threads.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Muse.png" width="850" alt="Muse AI Assistant">
</p>

---

### 07. High Performance PDF & FDX Export
Custom Rust rendering engine for pixel perfect PDF exports with customizable scene numbers and orphan protection. Exports directly to Final Draft (`.fdx`) while preserving section markers and color highlights.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Export.png" width="850" alt="Export PDF and FDX Dialog">
</p>

---

## 💾 Installation

### Linux
Download the installer from our **[Downloads Page](https://iyal.ink/actone/downloads/)** or **[Releases](https://github.com/BeetleBot/ActOne-Screenplay/releases)**:

```bash
tar -xzf ActOne-Linux-x64-0.4.12.tar.gz
cd ActOne-Linux-x64-0.4.12
sudo ./install.sh
actone
```

### Windows
Install directly from the **[Microsoft Store](https://apps.microsoft.com/detail/9PJMKR0937KK)**.

---

## 🛠️ Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) & Cargo

#### Linux Packages Required
| Distro | Required Packages |
| :--- | :--- |
| **Ubuntu / Debian** | `libgtk-3-dev` `libwebkit2gtk-4.1-dev` `libayatana-appindicator3-dev` `librsvg2-dev` `libsoup-3.0-dev` `libssl-dev` `libbz2-dev` |
| **Fedora** | `gtk3-devel` `webkit2gtk4.1-devel` `libappindicator-gtk3-devel` `librsvg2-devel` `libsoup3-devel` `openssl-devel` `bzip2-devel` |
| **Arch Linux** | `gtk3` `webkit2gtk-4.1` `libayatana-appindicator` `librsvg` `libsoup3` `openssl` `bzip2` |

### Steps
```bash
# Clone repository
git clone https://github.com/BeetleBot/ActOne-Screenplay.git
cd ActOne-Screenplay

# Install dependencies & run dev server
npm install
npm run tauri dev

# Build production app
npm run tauri build
```

---

## 🤝 Contributing

Pull requests are always welcome! Here are a few areas we are actively looking for help with:

- 🌐 **Non English Language Support**: Font rendering, localized keyboard shortcuts, complex script rendering (Tamil, Hindi, CJK, etc.), and multi language PDF export.
- 🍎 **macOS Build Target**: Help setup and test native `.dmg` / `.app` builds via Tauri.
- 🤖 **Agentic Muse AI**: Adding autonomous script editing, story research, automated scene breakdowns, and multi agent writer workflows.
- 📄 **File Converters**: Import and export filters for `.fdx`, `.highland`, `.scriv`, and Fountain archives.
- 🐛 **Bug Fixes & UI Tweaks**: Performance fixes, visual theme polish, and small usability improvements.

---

## 📄 License

ActOne Screenplay is open source software under the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.

```
Copyright (C) 2026 Iyal Inc.
ActOne Screenplay is free software: you can redistribute it and/or modify it under the terms of
the GNU General Public License as published by the Free Software Foundation.
```

<div align="center">
  <br>
  <b>Engineered by <a href="https://iyal.ink">iyal.ink</a></b>
</div>
