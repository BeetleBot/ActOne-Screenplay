<div align="center">

  <img src="https://iyal.ink/assets/actone-icon.png" alt="ActOne Logo" width="140">

  # ActOne Screenplay Studio

  <p align="center">
    <a href="https://iyal.ink/actone/">
      <img src="https://img.shields.io/badge/Official%20Website-iyal.ink%2Factone-10B981?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Official Website" />
    </a>
    &nbsp;
    <a href="https://github.com/iyal-ink/ActOneCode/releases">
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
    <b>A modern, feature-rich desktop screenplay studio with index cards, custom themes, ambient focus audio, and Fountain markup support.</b>
    <br>
    <i>Built with React, CodeMirror & Tauri • Licensed under GPLv3 • Engineered by <a href="https://iyal.ink">iyal.ink</a></i>
  </p>

</div>

---

## 🌟 Overview

**ActOne** is a desktop screenplay editor supporting Fountain markup, index cards, scene outline navigation, custom visual themes, and ambient audio playback.

> ⌨️ **Prefer a Terminal Interface?**  
> Check out **[FountTUI](https://fount.iyal.ink)**—our distraction-free terminal Fountain screenplay editor built in Rust & Ratatui!

---

## ⚡ Quick Start & Installation

### 🐧 Linux (Arch / Ubuntu / Fedora / Debian)
Download the latest Linux archive from our **[Downloads Page](https://iyal.ink/actone/downloads/)** or **[Releases](https://github.com/iyal-ink/ActOne-Screenplay/releases)**:

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

### ❄️ Flatpak / Flathub (Linux)
*Coming soon to Flathub!*

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🎬 **Live Fountain Formatting** | Auto-detects and formats Scene Headings, Action, Characters, Dialogue, Parentheticals, and Transitions automatically as you type. |
| 🃏 **Index Cards** | Grid view to organize acts, scenes, color-coded plot beats, and sequence outlines visually. |

| 🌲 **Script Outline Tree** | Jump instantly between acts, scenes, and character entrances with side-panel outline navigation. |
| 🎨 **Theme Designer** | Create, customize, and export your own editor themes or pick from curated dark, light, and typewriter palettes. |
| 🎧 **Ambient Focus Audio** | Built-in soundscapes (Rain, Coffee Shop, White Noise, Ambient Synth) designed for deep focus writing sessions. |
| 📄 **PDF & Fountain Export** | Export production-ready scripts formatted strictly to industry specs (100% exact margins, Courier Prime typography). |
| 🔒 **Local & Private** | Your screenplays stay local on your hard drive in open plain text. No mandatory cloud accounts or subscriptions. |

---

## 🚀 Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) & Cargo (for Tauri backend)
- Linux build dependencies (`libgtk-3-dev`, `webkit2gtk`, `libssl-dev`)

### Build Steps
```bash
# 1. Clone the repository
git clone https://github.com/iyal-ink/ActOneCode.git
cd ActOneCode

# 2. Install frontend dependencies
npm install

# 3. Launch in development mode
npm run tauri dev

# 4. Build desktop production packages
npm run tauri build
```

---

## 📄 Licensing

ActOne is open-source software licensed under the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.

```
Copyright (C) 2026 Iyal Inc.
ActOne is free software: you can redistribute it and/or modify it under the terms of
the GNU General Public License as published by the Free Software Foundation.
```

---

<div align="center">

  <br>

  <b>ActOne Screenplay Studio is engineered with care by <a href="https://iyal.ink">iyal.ink</a></b>  
  <i>Crafting free, open, and focused storytelling tools for independent screenwriters worldwide.</i>

  <br><br>

  🌐 <b><a href="https://iyal.ink">iyal.ink</a></b> &nbsp;•&nbsp; 🎬 <b><a href="https://iyal.ink/actone/">ActOne Studio</a></b> &nbsp;•&nbsp; ⌨️ <b><a href="https://iyal.ink/fount/">FountTUI</a></b>

</div>
