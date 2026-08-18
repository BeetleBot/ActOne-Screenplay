import re

content = open("src/utils/actone.ts").read()

# Make sure we add Assets and Type to the interface
content = content.replace("export interface ScriptInfo {\n", """export interface ScriptInfo {\n  type?: "fountain" | "markdown";\n""")
content = content.replace("promptChats?: { conversations: unknown[]; activeConversationId: string | null };\n}", "promptChats?: { conversations: unknown[]; activeConversationId: string | null };\n  assets?: Record<string, Uint8Array>;\n}")

# Update unpackActoneBundle
# Find where it parses fountain.json
unpack_logic = """
  let scripts: ScriptInfo[];
  let assets: Record<string, Uint8Array> = {};

  // Extract assets
  for (const key in unzipped) {
    if (key.startsWith("files/assets/") && !key.endsWith("/")) {
      assets[key] = unzipped[key];
    }
  }

  const oldToNewPath: Record<string, string> = {};

  if (unzipped["project.json"]) {
    const manifest: { name: string; file: string; type?: "fountain" | "markdown" }[] = JSON.parse(strFromU8(unzipped["project.json"]));
    scripts = manifest.map((entry) => {
      const content = unzipped[entry.file] ? strFromU8(unzipped[entry.file]) : "";
      return { name: entry.name, fileName: entry.file, type: entry.type || "fountain", content, savedContent: content };
    });
    if (scripts.length === 0) {
      const name = bundleName || "Untitled";
      scripts = [{ name, fileName: `files/${name}.fountain`, type: "fountain", content: "", savedContent: "" }];
    }
  } else if (unzipped["fountain.json"]) {
    const manifest: { name: string; file: string }[] = JSON.parse(strFromU8(unzipped["fountain.json"]));
    scripts = manifest.map((entry) => {
      const content = unzipped[entry.file] ? strFromU8(unzipped[entry.file]) : "";
      const newFile = entry.file.startsWith("files/") ? entry.file : `files/${entry.file}`;
      if (entry.file !== newFile) oldToNewPath[entry.file] = newFile;
      return { name: entry.name, fileName: newFile, type: "fountain", content, savedContent: content };
    });
    if (scripts.length === 0) {
      const name = bundleName || "Untitled";
      scripts = [{ name, fileName: `files/${name}.fountain`, type: "fountain", content: "", savedContent: "" }];
    }
  } else {
    const content = unzipped["document.fountain"] ? strFromU8(unzipped["document.fountain"]) : "";
    const name = bundleName || "Untitled";
    oldToNewPath["document.fountain"] = `files/${name}.fountain`;
    scripts = [{ name, fileName: `files/${name}.fountain`, type: "fountain", content, savedContent: content }];
  }
"""

content = re.sub(r'  let scripts: ScriptInfo\[\];\s*if \(unzipped\["fountain\.json"\]\) \{.*?\} else \{.*?\}', unpack_logic, content, flags=re.DOTALL)

# Add migration to settings parsing
migrate_settings = """
  const migrateKeyed = (obj: any) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const migrated: any = {};
    let changed = false;
    for (const key in obj) {
      if (oldToNewPath[key]) {
        migrated[oldToNewPath[key]] = obj[key];
        changed = true;
      } else {
        migrated[key] = obj[key];
      }
    }
    return changed ? migrated : obj;
  };
  
  if (Object.keys(oldToNewPath).length > 0) {
    if (settings.notepad && typeof settings.notepad === 'object') settings.notepad = migrateKeyed(settings.notepad);
    if (settings.genders && typeof settings.genders === 'object') settings.genders = migrateKeyed(settings.genders);
    if (settings.todos && typeof settings.todos === 'object' && !Array.isArray(settings.todos)) settings.todos = migrateKeyed(settings.todos);
    if (settings.parking && typeof settings.parking === 'object' && !Array.isArray(settings.parking)) settings.parking = migrateKeyed(settings.parking);
  }

  return { scripts, settings, promptChats: promptChatsData as ActoneBundle["promptChats"], assets };
"""

content = content.replace('  return { scripts, settings, promptChats: promptChatsData as ActoneBundle["promptChats"] };', migrate_settings)

# Update packActoneBundle & packActoneBundleAsync
pack_logic = """
    const manifest = scripts.map((s) => ({ name: s.name, file: s.fileName, type: s.type || "fountain" }));

    const entries: Record<string, Uint8Array> = {
      "project.json": strToU8(JSON.stringify(manifest, null, 2)),
      "settings.json": strToU8(JSON.stringify(restSettings || {}, null, 2)),
      "sprint_data.json": strToU8(JSON.stringify(sprintData || [], null, 2)),
      "production_tags.json": strToU8(JSON.stringify(productionTags || { tags: [], definitions: [] }, null, 2)),
      "muse.json": strToU8(JSON.stringify(promptChats || { conversations: [], activeConversationId: null }, null, 2)),
    };
    
    const assets = settings.assets as Record<string, Uint8Array> | undefined;
    if (assets) {
      for (const key in assets) {
        if (key.startsWith("files/assets/")) {
          entries[key] = assets[key];
        }
      }
    }
"""

content = re.sub(r'    const manifest = scripts\.map\(\(s\) => \(\{ name: s\.name, file: s\.fileName \}\)\);\s*const entries: Record<string, Uint8Array> = \{\s*"fountain\.json": strToU8\(JSON\.stringify\(manifest, null, 2\)\),\s*"settings\.json": strToU8\(JSON\.stringify\(restSettings \|\| \{\}, null, 2\)\),\s*"sprint_data\.json": strToU8\(JSON\.stringify\(sprintData \|\| \[\], null, 2\)\),\s*"production_tags\.json": strToU8\(JSON\.stringify\(productionTags \|\| \{ tags: \[\], definitions: \[\] \}, null, 2\)\),\s*"muse\.json": strToU8\(JSON\.stringify\(promptChats \|\| \{ conversations: \[\], activeConversationId: null \}, null, 2\)\),\s*\};', pack_logic, content)

open("src/utils/actone.ts", "w").write(content)
