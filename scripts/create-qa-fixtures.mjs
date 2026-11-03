import fs from "node:fs";
import path from "node:path";
import { zipSync, strToU8 } from "fflate";

const fixturesDir = path.resolve(process.cwd(), "qa-test-fixtures");

if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. Standard Fountain screenplay
const sampleFountain = `Title: THE LAST SCREENPLAY
Credit: Written by
Author: Test Writer
Draft date: November 2026

EXT. CHENNAI BEACH ROAD - NIGHT #1#

The rain pours over the neon reflections on the asphalt.
KAVIN (30s), drenched in rain, holds a sealed manila envelope.

KAVIN
(whispering to himself)
It ends tonight.

He steps onto the sand. The waves roar violently.

INT. COFFEE SHOP - DAY #2#

MEERA sits by the window, typing furiously on her laptop.
She looks up as the door chimes.

MEERA
You're late.

KAVIN
Traffic was impossible.

DISSOLVE TO:

EXT. MARINA LIGHTHOUSE - DUSK #3#

The beam of light sweeps across the Bay of Bengal.
`;
fs.writeFileSync(path.join(fixturesDir, "sample_screenplay.fountain"), sampleFountain, "utf8");

// 2. Multilingual Screenplay with Tamil Characters
const tamilDir = path.join(fixturesDir, "திரைக்கதை திட்டம்");
if (!fs.existsSync(tamilDir)) {
  fs.mkdirSync(tamilDir, { recursive: true });
}

const tamilFountain = `Title: இறுதிப் பயணம் (THE FINAL JOURNEY)
Credit: எழுதியவர்
Author: கவின் & மீரா
Draft date: 2026

EXT. சென்னை கடற்கரை - இரவு #1#

மழை பெய்து கொண்டிருக்கிறது. அலைகள் சீறிப் பாய்கின்றன.
கவின் கையில் ஒரு மர்மமான கடிதத்துடன் நிற்கிறான்.

கவின்
(மெல்லிய குரலில்)
இதுதான் ஆரம்பம்.

மீரா அவனருகில் வருகிறாள்.

மீரா
நீ சொல்வது எனக்குப் புரியவில்லை!

கவின் அவளை உற்றுப் பார்க்கிறான்.

CUT TO:

INT. பழைய நூலகம் - பகல் #2#

தூசிகள் படிந்த புத்தக அடுக்குகள்.
`;
fs.writeFileSync(path.join(tamilDir, "திரைக்கதை மாதிரி.fountain"), tamilFountain, "utf8");

// 3. Prose / Markdown document with tables, code, links
const sampleMarkdown = `# Production Notes & World Bible

Welcome to the **ActOne** test project documentation.

## Character Roster

| Name | Role | Motivation | Status |
| :--- | :--- | :--- | :--- |
| **Kavin** | Protagonist | Uncover the conspiracy | Active |
| **Meera** | Investigative Journalist | Expose the truth | Active |
| **Vikram** | Antagonist | Protect the syndicate | Hidden |

## Key Landmarks
- [Marina Beach](https://en.wikipedia.org/wiki/Marina_Beach)
- Central Railway Station
- Old Lighthouse Archives

## Logic & Ciphers

\`\`\`javascript
function decryptCoordinates(cipherText, key) {
  console.log("Decrypting plot cipher...", cipherText);
  return { lat: 13.0827, lng: 80.2707 };
}
\`\`\`

> *Note: Always check the tide before visiting the lighthouse at night.*
`;
fs.writeFileSync(path.join(fixturesDir, "sample_prose.md"), sampleMarkdown, "utf8");

// 4. Valid FDX File
const validFdx = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="4">
  <Content>
    <Paragraph Type="Scene Heading">
      <Text>EXT. CITY PARK - DAY</Text>
    </Paragraph>
    <Paragraph Type="Action">
      <Text>Sunlight filters through the oak trees.</Text>
    </Paragraph>
    <Paragraph Type="Character">
      <Text>SARAH</Text>
    </Paragraph>
    <Paragraph Type="Dialogue">
      <Text>We made it in time.</Text>
    </Paragraph>
  </Content>
</FinalDraft>`;
fs.writeFileSync(path.join(fixturesDir, "valid_sample.fdx"), validFdx, "utf8");

// 5. Damaged FDX File (Corrupt XML / Truncated)
const damagedFdx = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="4">
  <Content>
    <Paragraph Type="Scene Heading">
      <Text>EXT. BROKEN SCENE - NIGHT
    <!-- Truncated unclosed tags and illegal tokens -->
    <Paragraph Type="Action"><Text>System error`;
fs.writeFileSync(path.join(fixturesDir, "damaged_sample.fdx"), damagedFdx, "utf8");

// 6. Damaged Fade In file (Invalid ZIP / Corrupted byte stream)
const damagedFadeIn = Buffer.from("PK\x03\x04CORRUPTED_FADE_IN_HEADER_NOT_A_VALID_ARCHIVE_DATA");
fs.writeFileSync(path.join(fixturesDir, "damaged_sample.fadein"), damagedFadeIn);

// 7. Full .actone Project Bundle
// An .actone file starts with "ACT1" magic bytes (0x41, 0x43, 0x54, 0x31) followed by a ZIP archive.
const excalidrawContent = JSON.stringify({
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: [
    {
      id: "rect-1",
      type: "rectangle",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      strokeColor: "#1e1e1e",
      backgroundColor: "#a5d8ff",
      fillStyle: "solid",
      strokeWidth: 2,
    },
    {
      id: "text-1",
      type: "text",
      x: 120,
      y: 135,
      width: 160,
      height: 25,
      text: "Act I - The Hook",
      fontSize: 20,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
    }
  ],
  appState: { viewBackgroundColor: "#ffffff" },
  files: {}
});

const scripts = [
  {
    name: "Screenplay Main",
    fileName: "files/Screenplay Main.fountain",
    type: "fountain",
    content: sampleFountain,
  },
  {
    name: "World Bible",
    fileName: "files/World Bible.md",
    type: "markdown",
    content: sampleMarkdown,
  },
  {
    name: "Beat Board",
    fileName: "files/Beat Board.canvas",
    type: "canvas",
    content: excalidrawContent,
  }
];

const manifest = scripts.map(s => ({
  name: s.name,
  file: s.fileName,
  type: s.type
}));

const zipEntries = {
  "format.json": strToU8(JSON.stringify({ version: 4 }, null, 2)),
  "project.json": strToU8(JSON.stringify(manifest, null, 2)),
  "settings.json": strToU8(JSON.stringify({
    editorTheme: "light",
    fontSize: 14,
    showSceneNumbers: true,
  }, null, 2)),
  "characters.json": strToU8(JSON.stringify({
    "KAVIN": { gender: "male", color: "#3b82f6" },
    "MEERA": { gender: "female", color: "#ec4899" }
  }, null, 2)),
  "todos.json": strToU8(JSON.stringify([
    { id: "1", text: "Polish dialogue in Scene 2", completed: false },
    { id: "2", text: "Check lighthouse historical accuracy", completed: true }
  ], null, 2)),
  "parking.json": strToU8(JSON.stringify([
    { id: "p1", text: "Alternative twist: Vikram is Kavin's brother", createdAt: 1700000000 }
  ], null, 2)),
  "notepad.json": strToU8(JSON.stringify("General project scratchpad notes:\n- Review pacing of Act 2 midpoint.\n- Check weather continuity in Scene 3.")),
  "files/Screenplay Main.fountain": strToU8(sampleFountain),
  "files/World Bible.md": strToU8(sampleMarkdown),
  "files/Beat Board.canvas": strToU8(excalidrawContent)
};

const zippedBytes = zipSync(zipEntries);
const magic = Buffer.from([0x41, 0x43, 0x54, 0x31]); // ACT1
const actoneBundle = Buffer.concat([magic, Buffer.from(zippedBytes)]);

const bundlePath = path.join(fixturesDir, "Complete_Feature_Project.actone");
fs.writeFileSync(bundlePath, actoneBundle);

// 8. Corrupt Snapshot Recovery Test Project Directory
const snapshotRecoveryProjectDir = path.join(fixturesDir, "Snapshot_Recovery_Project");
const snapshotFolder = path.join(snapshotRecoveryProjectDir, ".actone_snapshots");
if (!fs.existsSync(snapshotFolder)) {
  fs.mkdirSync(snapshotFolder, { recursive: true });
}
// Create a dummy valid snapshot file inside it
fs.writeFileSync(path.join(snapshotFolder, "snapshot_20261103_120000.actone"), actoneBundle);
fs.writeFileSync(path.join(snapshotFolder, "snapshot_20261103_121500.actone"), actoneBundle);
// Intentionally damaged index.json
fs.writeFileSync(path.join(snapshotFolder, "index.json"), "{damaged_index_json_content: missing_brackets");

// Also write a copy of Complete_Feature_Project.actone inside Snapshot_Recovery_Project
fs.writeFileSync(path.join(snapshotRecoveryProjectDir, "Project.actone"), actoneBundle);

console.log("Successfully generated all QA fixtures in:", fixturesDir);
