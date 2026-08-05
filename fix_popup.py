import re

def process_file(path):
    with open(path, "r") as f:
        content = f.read()
    
    if "import { getCurrentWindow }" not in content:
        content = 'import { getCurrentWindow } from "@tauri-apps/api/window";\n' + content
        
    content = content.replace("await menu.popup();", "await menu.popup(undefined, getCurrentWindow());")
    
    with open(path, "w") as f:
        f.write(content)

process_file("src/components/FountainEditor.tsx")
process_file("src/components/layout/HeaderBar.tsx")
process_file("src/components/SnapshotsPanel.tsx")

print("Done")
