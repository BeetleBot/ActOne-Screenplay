import re

with open("src/components/FountainEditor.tsx", "r") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { Menu, MenuItem, Divider, ListItemIcon, ListItemText, Typography, Box } from "@mui/material";',
    'import { Divider, ListItemIcon, ListItemText, Typography, Box } from "@mui/material";\nimport { Menu, MenuItem, Submenu, PredefinedMenuItem } from "@tauri-apps/api/menu";'
)

# 2. State and ContextMenu Handler
new_handler = """  const handleContextMenu = async (event: React.MouseEvent) => {
    event.preventDefault();

    const v = viewRef.current;
    if (v) {
      const sel = v.state.selection.main;
      menuSelectionRef.current = {
        from: sel.from,
        to: sel.to,
        text: sel.from !== sel.to ? v.state.sliceDoc(sel.from, sel.to) : "",
      };
    }

    const hasSel = menuSelectionRef.current !== null && menuSelectionRef.current.from !== menuSelectionRef.current.to;
    const isSceneLine = currentSceneLine !== null;

    try {
      const items = [];

      const museItems = [];
      if (hasSel) {
        museItems.push(await MenuItem.new({ text: "Look up", action: () => handlePromptAction("lookup") }));
        museItems.push(await MenuItem.new({ text: "Synonyms", action: () => handlePromptAction("synonyms") }));
        
        const rephraseItems = [];
        for (const preset of promptConfig.rephrasePresets) {
          rephraseItems.push(
            await MenuItem.new({ 
              text: preset.name || "Untitled", 
              enabled: !!preset.prompt.trim(),
              action: () => handleRephraseClick(preset.prompt) 
            })
          );
        }
        museItems.push(await Submenu.new({ text: "Rephrase", items: rephraseItems }));

        const translateItems = [];
        for (const lang of promptConfig.translateLanguages) {
          translateItems.push(
            await MenuItem.new({
              text: lang,
              enabled: translatingLang !== lang,
              action: () => handleTranslateClick(lang)
            })
          );
        }
        museItems.push(await Submenu.new({ text: "Translate", items: translateItems }));
      } else {
        const translateWholeItems = [];
        for (const lang of promptConfig.translateLanguages) {
          translateWholeItems.push(
            await MenuItem.new({
              text: lang,
              enabled: translatingLang !== lang,
              action: () => handleTranslateWholeDocument(lang)
            })
          );
        }
        museItems.push(await Submenu.new({ text: "Translate Whole Script", items: translateWholeItems }));
      }

      items.push(await Submenu.new({ text: "Muse", items: museItems }));
      items.push(await PredefinedMenuItem.new({ item: 'Separator' }));

      items.push(await MenuItem.new({ text: 'Cut', enabled: hasSel, action: () => handleEditorAction("cut") }));
      items.push(await MenuItem.new({ text: 'Copy', enabled: hasSel, action: () => handleEditorAction("copy") }));
      items.push(await MenuItem.new({ text: 'Paste', action: () => handleEditorAction("paste") }));

      items.push(await PredefinedMenuItem.new({ item: 'Separator' }));

      const highlightItems = [];
      for (const col of HIGHLIGHT_COLORS) {
        highlightItems.push(await MenuItem.new({ text: col.label, action: () => handleHighlightScene(col.key) }));
      }
      items.push(await Submenu.new({ text: "Highlight Scene", enabled: isSceneLine, items: highlightItems }));

      const markerItems = [];
      for (const col of MARKER_COLORS) {
        markerItems.push(await MenuItem.new({ text: col.label, action: () => handleDropMarkerWithColor(col.key) }));
      }
      items.push(await Submenu.new({ text: "Drop Marker", items: markerItems }));

      items.push(await PredefinedMenuItem.new({ item: 'Separator' }));

      const formatItems = [];
      formatItems.push(await MenuItem.new({ text: "Bold", action: () => toggleInlineMarker("**") }));
      formatItems.push(await MenuItem.new({ text: "Italic", action: () => toggleInlineMarker("*") }));
      formatItems.push(await MenuItem.new({ text: "Underline", action: () => toggleInlineMarker("_") }));
      items.push(await Submenu.new({ text: "Format", enabled: hasSel, items: formatItems }));

      const transformItems = [];
      transformItems.push(await MenuItem.new({ text: "UPPERCASE", action: () => handleTransformCase("upper") }));
      transformItems.push(await MenuItem.new({ text: "Title Case", action: () => handleTransformCase("title") }));
      transformItems.push(await MenuItem.new({ text: "lowercase", action: () => handleTransformCase("lower") }));
      items.push(await Submenu.new({ text: "Transform Case", enabled: hasSel, items: transformItems }));

      items.push(await MenuItem.new({ text: "Look Up Word", enabled: hasSel, action: () => handleLookUpSelection() }));

      items.push(await PredefinedMenuItem.new({ item: 'Separator' }));

      items.push(await MenuItem.new({ text: "Create Task", enabled: hasSel, action: () => handleCreateTaskFromSelection() }));
      items.push(await MenuItem.new({ text: "Park Selection", enabled: hasSel, action: () => handleParkSelection() }));

      const menu = await Menu.new({ items });
      await menu.popup();
      setTimeout(() => viewRef.current?.focus(), 0);
    } catch (err) {
      logger.error("editor", "Failed to open native context menu", err);
    }
  };"""

old_handler_start = "  const handleContextMenu = (event: React.MouseEvent) => {"
old_handler_end = "  const handleClose = () => {"
content = content.replace(content[content.find(old_handler_start):content.find(old_handler_end)], new_handler + "\n\n")

# 3. Clean up JSX (removing `const menuProps` and everything after `<div ref={containerRef}... />`)
menu_props_str = "  const menuProps = {"
return_str = "  return ("
container_div_str = '      <div ref={containerRef} style={{ flex: 1, minHeight: "100%", cursor: "text" }} onClick={() => viewRef.current?.focus()} />'

start_idx = content.find(menu_props_str)
end_idx = content.rfind("    </div>")

if start_idx != -1 and end_idx != -1:
    before = content[:start_idx]
    after = content[end_idx:]
    
    new_render = """  return (
    <div 
      className={`editor-font-wrapper ${fontFamily}`} 
      style={{ display: "flex", flex: 1, minHeight: "100%", flexDirection: "column" }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div ref={containerRef} style={{ flex: 1, minHeight: "100%", cursor: "text" }} onClick={() => viewRef.current?.focus()} />
"""
    content = before + new_render + after

with open("src/components/FountainEditor.tsx", "w") as f:
    f.write(content)

print("Done")
