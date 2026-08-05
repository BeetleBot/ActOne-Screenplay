import re

with open("src/components/FountainEditor.tsx", "r") as f:
    content = f.read()

content = content.replace("    setContextMenu(null);\n", "")
content = content.replace("    setPromptMenuAnchorEl(null);\n", "")
content = content.replace("    setRephraseMenuAnchorEl(null);\n", "")
content = content.replace("    setFormatMenuAnchorEl(null);\n", "")
content = content.replace("    setHighlightMenuAnchorEl(null);\n", "")
content = content.replace("    setMarkerMenuAnchorEl(null);\n", "")
content = content.replace("    setTransformMenuAnchorEl(null);\n", "")
content = content.replace("    setTranslateMenuAnchorEl(null);\n", "")

with open("src/components/FountainEditor.tsx", "w") as f:
    f.write(content)

with open("src/components/SnapshotsPanel.tsx", "r") as f:
    content2 = f.read()

content2 = content2.replace(' Divider, Tooltip }', ' Tooltip }')

with open("src/components/SnapshotsPanel.tsx", "w") as f:
    f.write(content2)

print("Fixed")
