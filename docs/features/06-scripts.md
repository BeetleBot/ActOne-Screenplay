# Multi-Script Bundles

ActOne's `.actone` bundle format supports multiple named scripts within a single project file.

## Feature Overview

A single `.actone` bundle can contain multiple `.fountain` scripts (e.g., "Act One", "Act Two", "Act Three"). Each script is a separate Fountain document within the bundle.

## Switching Scripts

**Via Status Bar:**
```
MyScreenplay.actone > Act One.fountain                                    Words: 4,200  Pages: 12
```

Clicking the filename opens a drop-up menu showing all scripts in the bundle. Select one to switch.

**Via Scripts Sidebar Tab:**
The Scripts tab (second in the activity bar) lists all scripts with:
- Active script highlighted and marked with ✓
- Click any script to switch
- `[+]` button to add a new script

## Managing Scripts

### Adding a Script

Click `[+]` in the Scripts sidebar. Enter a name when prompted. A new empty script is created.

### Renaming a Script

Click the `⋮` menu on a script and select "Rename." Enter the new name.

### Deleting a Script

Click the `⋮` menu and select "Delete." Confirms before removing. At least one script must remain in the bundle.

## Export

### Active Script Export

The Export Modal (`Ctrl+P`) exports the currently active script. Suggested filename format: `{BundleName}_{ScriptName}.pdf`

### Export All

The Scripts sidebar has an **Export All** button that exports every script in the bundle as separate files:
- `MyScreenplay_Act One.pdf`
- `MyScreenplay_Act Two.pdf`
- `MyScreenplay_Act Three.pdf`

## Legacy Compatibility

When opening a pre-multi-script `.actone` bundle:
- A single script is created named after the bundle
- On save, the bundle is transparently upgraded to the new format
