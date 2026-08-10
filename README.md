<div align="center">

  <img src="https://iyal.ink/assets/ActOne_apptile.png" alt="ActOne Logo" width="140">

  # ActOne Screenplay Studio

  <p align="center">
    <a href="https://iyal.ink/actone/">
      <img src="https://img.shields.io/badge/Official%20Website-iyal.ink%2Factone-10B981?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Official Website" />
    </a>
    &nbsp;
    <a href="https://github.com/BeetleBot/ActOne-Screenplay/releases">
      <img src="https://img.shields.io/badge/Download%20Linux-v0.4.12-10B981?style=for-the-badge&logo=linux&logoColor=white" alt="Download Linux" />
    </a>
    &nbsp;
    <a href="https://apps.microsoft.com/detail/9PJMKR0937KK">
      <img src="https://img.shields.io/badge/Microsoft%20Store-v0.4.12-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Microsoft Store" />
    </a>
    &nbsp;
    <a href="https://flathub.org">
      <img src="https://img.shields.io/badge/Flathub-Coming%20Soon-4A90E2?style=for-the-badge&logo=flatpak&logoColor=white" alt="Flathub" />
    </a>
  </p>

  <p align="center">
    <b>The native Fountain screenplay editor for Windows and Linux.</b>
    <br>
    <i>Built with React, CodeMirror 6 & Tauri • Licensed under GPLv3 • Engineered by <a href="https://iyal.ink">iyal.ink</a></i>
  </p>

</div>

---

## 🌟 Overview

**ActOne Screenplay** is the native plain-text Fountain screenplay editor for Windows and Linux. Featuring live syntax formatting, outline tree navigation, X-Ray analytics, automatic revision snapshots, and local Muse AI assistant—all without leaving your desktop.

> ⌨️ **Prefer a Terminal Interface?**  
> Check out **[FountTUI](https://fount.iyal.ink)**—our distraction-free terminal Fountain screenplay editor built in Rust & Ratatui!

---

## ✨ Features at a Glance

### 01. Native Fountain Screenplay Editing
- **Live Syntax Formatting:** Built-in CodeMirror 6 engine with real-time Fountain syntax coloring and clean manuscript rendering.
- **Smart Formatting Tools:** Automatic line-spacing, Tab-to-cycle Fountain prefixes (`@`, `.`, `>`), and auto-closing parentheticals.
- **Character Autocomplete:** Real-time ghost text suggestions for character names, locations, and parentheticals.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Editor.png" width="850" alt="Native Fountain Screenplay Editor">
</p>

---

### 02. Outline Tree Navigator
- **Hierarchical View:** Collapsible tree structure mapping sections (`#`), scene headings, and synopses (`=`) instantly.
- **Scene Highlights & Storylines:** Visual color markers and plot arc badges attached to scene headers in outline.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Navigator.png" width="850" alt="Outline Tree Navigator">
</p>

---

### 03. Multi-Script Projects (`.actone`)
- **Drafts & Assets Workspace:** Package multiple plain `.fountain` screenplay files, local Notepad sheets, checklists, and session progress data into a single, organized project folder.
- **Open ZIP Standards:** ActOne Screenplay bundles save as standard ZIP archives to guarantee complete user data ownership.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Multi-Scripts.png" width="850" alt="Multi-Script Projects Workspace">
</p>

---

### 04. Automatic Version Snapshots
- **Interval Backups:** Auto-interval, manual, and save-triggered local snapshots keep track of every paragraph revision history.
- **One-Click Restores:** Compare differences and rollback to past snapshots instantly without relying on cloud servers.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1snapshot.png" width="850" alt="Automatic Version Snapshots">
</p>

---

### 05. X-Ray Screenplay Analytics
- **Visual Pacing & Ratios:** Charts displaying Dialogue-to-Action ratios, day/night scene distributions, and pacing charts.
- **Character Co-Occurrence:** Interactive connection graphs mapping scene occurrences between screenplay characters.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Xray.png" width="850" alt="X-Ray Screenplay Analytics">
</p>

---

### 06. Muse AI Writing Assistant
- **Local & Cloud Models:** Connect via local Ollama instances for 100% private models or secure cloud API keys.
- **Command Integrations:** Use `@write-scene`, `@lookup`, and `@synonyms` directly in context-aware screenplay chat threads.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Muse.png" width="850" alt="Muse AI Writing Assistant">
</p>

---

### 07. High-Performance Rust PDF & FDX Export
- **Rust Rendering Engine:** Pixel-perfect formatting with cosmic-text rendering, customizable scene numbers, and orphan protection.
- **Final Draft Compatibility:** Exports screenplays directly to Final Draft (`.fdx`) format, preserving section and color highlights.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Export.png" width="850" alt="Export PDF and FDX Dialog">
</p>

---

## ⚡ Quick Start & Installation

### 🐧 Linux (Arch / Ubuntu / Fedora / Debian)
Download the latest Linux installer archive from our **[Downloads Page](https://iyal.ink/actone/downloads/)** or **[Releases](https://github.com/BeetleBot/ActOne-Screenplay/releases)**:

```bash
tar -xzf ActOne-Linux-x64-0.4.12.tar.gz
cd ActOne-Linux-x64-0.4.12
sudo ./install.sh
actone
```

### 🪟 Windows (Microsoft Store)
Get ActOne directly from the Microsoft Store:

<a href="https://apps.microsoft.com/detail/9PJMKR0937KK">
  <img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200" alt="Get it from Microsoft Store"/>
</a>

---

## 🚀 Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) & Cargo (for Tauri backend)

#### Linux System Dependencies
| Dependency Group | Libraries / Packages | Ubuntu/Debian | Fedora | Arch Linux |
| :--- | :--- | :--- | :--- | :--- |
| **GUI & Display** | GTK 3, WebKit2GTK 4.1 | `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libjavascriptcoregtk-4.1-dev` | `gtk3-devel`, `webkit2gtk4.1-devel` | `gtk3`, `webkit2gtk-4.1` |
| **System Tray** | Ayatana AppIndicator | `libayatana-appindicator3-dev` | `libappindicator-gtk3-devel` | `libayatana-appindicator` |
| **Graphics & Icons** | Cairo, Pango, RSVG | `librsvg2-dev` | `librsvg2-devel` | `librsvg` |
| **Network & Crypto** | LibSoup 3, OpenSSL, Bzip2 | `libsoup-3.0-dev`, `libssl-dev`, `libbz2-dev` | `libsoup3-devel`, `openssl-devel`, `bzip2-devel` | `libsoup3`, `openssl`, `bzip2` |
| **Audio & Media** | GStreamer / Pulseaudio | `libgstreamer1.0-dev`, `libpulse-dev` | `gstreamer1-devel`, `pulseaudio-libs-devel` | `gstreamer`, `pulseaudio` |

### Build Steps

```bash
# 1. Clone the repository
git clone https://github.com/BeetleBot/ActOne-Screenplay.git
cd ActOne-Screenplay

# 2. Install frontend dependencies
npm install

# 3. Launch in development mode
npm run tauri dev

# 4. Build desktop production packages
npm run tauri build
```

---

## 🤝 Contributing & Community Focus Areas

We welcome contributions from screenwriters, developers, and open-source enthusiasts worldwide! Key focus areas where community Pull Requests are especially encouraged include:

- 🌐 **Multilingual Screenwriting & PDF Export**: Enhancing full support for non-English screenwriting (Indic scripts like Tamil & Hindi, CJK, European languages)—including typography, complex font rendering, localized UI translations, and multi-language PDF/FDX exports.
- 🍎 **macOS Native Packaging**: Helping set up, test, and maintain native macOS app targets (`.dmg` / `.app`) via Tauri.
- 🤖 **Agentic Muse AI Engine**: Evolving **Muse AI** into an autonomous storytelling partner—enabling multi-step script edits, automated scene breakdowns, character arc analysis, and agentic workflows via local Ollama or cloud models.
- 📄 **Export Format Converters**: Expanding import/export compatibility for Final Draft (`.fdx`), Highland (`.highland`), Scrivener (`.scriv`), and Fountain bundles.

Feel free to open an issue or submit a Pull Request targeting `main`!


---

## 📄 Licensing

ActOne Screenplay is open-source software licensed under the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.

```
Copyright (C) 2026 Iyal Inc.
ActOne Screenplay is free software: you can redistribute it and/or modify it under the terms of
the GNU General Public License as published by the Free Software Foundation.
```

---

<div align="center">

  <br>

  <b>ActOne Screenplay Studio is engineered with care by <a href="https://iyal.ink">iyal.ink</a></b>  
  <i>Crafting free, open, and focused storytelling tools for independent screenwriters worldwide.</i>

  <br><br>

  🌐 <b><a href="https://iyal.ink">iyal.ink</a></b> &nbsp;•&nbsp; 🎬 <b><a href="https://iyal.ink/actone/">ActOne Studio</a></b> &nbsp;•&nbsp; ⌨️ <b><a href="https://iyal.ink/fount/">FountTUI</a></b> &nbsp;•&nbsp; 💬 <b><a href="https://discord.gg/XTPjm93eNx">Discord Community</a></b>

</div>
