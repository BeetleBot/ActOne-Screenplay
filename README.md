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
    The distraction free, open source Fountain screenplay editor for Windows and Linux.<br>
    The perfect alternative to Final Draft, Highland, and Beat.
    <br><br>
    <i>GPLv3 • Built by <a href="https://iyal.ink">iyal.ink</a></i>
  </p>

</div>

---

### Write Your Masterpiece. Own Your Tools.

ActOne Screenplay is the ultimate **free and open source screenwriting software** built natively for PC and Linux users. If you've ever wished for the elegance of **Highland** or the simplicity of **Beat** but on a Windows or Linux machine, ActOne is your answer. 

Designed for both professional screenwriters and indie filmmakers, ActOne provides a **distraction free** writing environment that uses plain-text [Fountain syntax](https://fountain.io/). Say goodbye to expensive subscriptions, locked-down proprietary file formats, and bloated interfaces. Whether you are drafting a pilot, a feature film, or a short, ActOne is the premier **Windows screenplay** and **Linux writer** app that gets out of your way and lets you focus on the story.

**Why choose ActOne for screenwriting?** It offers an unparalleled mix of live Fountain formatting, structural organization tools, and **Final Draft (`.fdx`)** compatibility without the hefty price tag.

> ⌨️ **Prefer the terminal?** Check out **[FountTUI](https://fount.iyal.ink)**, our terminal-based Fountain screenplay editor built in Rust.

---

## 🎬 Core Screenwriting Features

### 01. Distraction Free, Native Fountain Editing
Enjoy live syntax highlighting powered by CodeMirror 6. Our editor handles standard screenwriting formatting effortlessly. Features include automatic character autocomplete, Tab-to-cycle Fountain prefixes (`@`, `.`, `>`), and auto-closing parentheticals. Write at the speed of thought.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Editor.png" width="850" alt="Fountain Screenplay Editor for Windows and Linux">
</p>

---

### 02. Outline Tree Navigator
Mapping out your screenplay's structure is effortless. Instantly navigate your script through a collapsible outline tree that maps sections (`#`), scene headers, and synopses (`=`). Visual plot arc markers let you track storylines and beats at a glance.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Navigator.png" width="850" alt="Outline Tree Navigator for Screenwriting">
</p>

---

### 03. Multi-Script Projects (`.actone`)
Package multiple `.fountain` screenplay files, scratchpad notes, character lists, and progress data into a single `.actone` project file. The `.actone` format is actually just a glorified ZIP file! If you ever need raw access to your work outside of ActOne, simply open the `.actone` file using an archiver like **[7-Zip](https://www.7-zip.org/)** (highly recommended) to extract your raw `.fountain` text files and other data. Your screenwriting data is never locked in a proprietary format.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Multi-Scripts.png" width="850" alt="Multi Script Projects Workspace">
</p>

---

### 04. Local Version Snapshots & Backups
Never lose a great scene again. Automatic, interval, and save-triggered local snapshots keep track of every revision. Compare diffs and restore previous screenplay drafts with a single click—100% offline, with no cloud required.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1snapshot.png" width="850" alt="Automatic Version Snapshots for Screenplays">
</p>

---

### 05. X-Ray Screenplay Analytics
Understand your script's DNA. Track dialogue-to-action ratios, day vs. night scene distributions, story pacing, and character co-occurrence connection graphs. Perfect for rewriting and polishing your final draft.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Xray.png" width="850" alt="X-Ray Screenplay Analytics">
</p>

---

### 06. Muse AI Writing Assistant
Bust through writer's block with our optional AI assistant. Muse connects to your local Ollama instance for 100% offline privacy, or external API keys. Use `@write-scene`, `@lookup`, and `@synonyms` in contextual chat threads to brainstorm beats and dialogue.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Muse.png" width="850" alt="Muse AI Assistant for Screenwriting">
</p>

---

### 07. High-Performance PDF & Final Draft (.FDX) Export
Production-ready exports in seconds. Our custom Rust rendering engine delivers pixel-perfect PDF exports with customizable scene numbers and orphan protection. Need to collaborate? Export your screenplay directly to **Final Draft (`.fdx`)** while preserving section markers and color highlights.

<p align="center">
  <img src="https://iyal.ink/assets/website%20images/A1-Export.png" width="850" alt="Export PDF and Final Draft FDX Dialog">
</p>

---

## 💾 Installation

### Linux
Download the installer from our **[Downloads Page](https://iyal.ink/actone/downloads/)** or our **[Releases](https://github.com/BeetleBot/ActOne-Screenplay/releases)**:

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

Pull requests are always welcome! Whether you're a rust developer, a typescript wizard, or just someone who loves screenwriting software, here are a few areas we are actively looking for help with:

- 🌐 **Non-English Language Support**: Font rendering, localized keyboard shortcuts, complex script rendering (Tamil, Hindi, CJK, etc.), and multi-language PDF export.
- 🍎 **macOS Build Target**: Help setup and test native `.dmg` / `.app` builds via Tauri for Mac users.
- 🤖 **Agentic Muse AI**: Adding autonomous script editing, story research, automated scene breakdowns, and multi-agent writer workflows.
- 📄 **File Converters**: Import and export filters for `.fdx`, `.highland`, `.scriv`, and Fountain archives.
- 🐛 **Bug Fixes & UI Tweaks**: Performance fixes, visual theme polish, and small usability improvements for the ultimate distraction free writing experience.

---

## 📄 License

ActOne Screenplay is open source screenwriting software released under the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.

```
Copyright (C) 2026 Iyal Inc.
ActOne Screenplay is free software: you can redistribute it and/or modify it under the terms of
the GNU General Public License as published by the Free Software Foundation.
```

<div align="center">
  <br>
  <b>Engineered by <a href="https://iyal.ink">iyal.ink</a></b>
</div>
