# Multi-Script Projects

ActOne's `.actone` project format supports multiple named screenplay scripts within a single project file.

## Feature Overview

A single `.actone` project can contain multiple `.fountain` screenplay scripts (e.g., "Main Draft", "Director's Cut", "Act One", "Episode 1"). Each script is a separate Fountain document within the project.

## Landing Pad (Empty Project State)

When a new `.actone` project is created with no scripts, or if all existing scripts are deleted from a project, the main window enters the **Landing Pad** state:

- **Editor is replaced with Landing Pad UI**: A clean, centered desktop prompt ("Act One, Scene One. / Every screenplay starts here. Create your first script to begin writing.") with a **"Create a new script"** button.
- **Sidebar Feature Tabs Disabled**: Feature buttons (Outline, Notepad, Markers, Tasks, Snapshots, Sprint, Parking) in the Activity Bar are greyed out (`opacity: 0.35`, `pointerEvents: 'none'`) since they require an active screenplay.
- **Scripts Pane Active**: The sidebar automatically switches to and opens the Scripts pane so you can view project files and add or import scripts.
- **Status Bar & Muse Muted**: Word counts, scene counts, and page metrics display *"No active script"*. The Muse AI button is greyed out, unclickable, and its background glow is disabled.
- **Creating a Script**: Clicking "Create a new script" on the Landing Pad or the `[+]` button in the Scripts pane prompts for a name, adds the script to the project, and automatically transitions into the editor.

## Switching Scripts

**Via Status Bar:**
```
Project: MyProject.actone (Act One)                                     Words: 4,200  Pages: 12
```

Clicking the filename in the Status Bar opens a drop-up menu showing all scripts in the project. Select one to switch.

**Via Scripts Sidebar Tab:**
The Scripts tab (second in the activity bar — Content group) lists all scripts as **rounded cards** (`8px` radius, `40px` min-height, soft shadow, drag handle `14px`):
- **Pill search** (`20px` radius) to filter scripts; thin `6px` pill scrollbar
- Active script highlighted with `action.selected` + border glow and stronger shadow
- Click any card to switch; file-type tag (`FOUNTAIN`/`MD`, `5px` radius, `accent` vs `default`)
- `[+]` button to add a new script; download icon to import `.fountain` / `.txt` files into the project
- Drag-and-drop reordering of scripts; `⋮` menu ( `16px` icon) per card: Rename / Duplicate / Move Up/Down / Delete

## Managing Scripts

### Adding a Script

Click `[+]` in the Scripts sidebar or click "Create a new script" in the Landing Pad. Enter a name when prompted. A new script is created and opened.

### Renaming a Script

Double-click a script name in the list or click the `⋮` menu on a script and select "Rename." Enter the new name and press Enter.

### Deleting a Script

Click the `⋮` menu and select "Delete." Confirms before removing. If you delete the last remaining script in a project, the project transitions back to the **Landing Pad** state.

## Export

### Active Script Export

The Export Modal (`Ctrl+P`) exports the currently active script/screenplay. Suggested filename format: `{ProjectName}_{ScriptName}.pdf`

### Export All

The Scripts sidebar has an **Export All** button that exports every script in the project as separate files:
- `MyProject_Act One.pdf`
- `MyProject_Act Two.pdf`
- `MyProject_Act Three.pdf`

## Legacy Compatibility

When opening a standalone `.fountain` file or pre-multi-script `.actone` file:
- A single script is created named after the file
- On save as `.actone`, the project is stored in the standard multi-script format
