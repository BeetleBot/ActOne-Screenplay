import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile } from "fs/promises";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const types = ["actone", "actheme", "fountain"];

const SRC = (t) => join(root, `assets/Logos And Icons/File Icons/${t} Icon.png`);
const DST = (t, ext) => join(root, `src-tauri/icons/${t}-document.${ext}`);
const DST_TILE = (t) => join(root, `src-tauri/icons/${t}-document-tile.png`);

async function main() {
  for (const t of types) {
    // 3000x3000 PNG → 256x256 document.png
    await sharp(SRC(t)).resize(256, 256).png().toFile(DST(t, "png"));
    console.log(`  ${t}-document.png`);

    // 256x256 document-tile.png
    await sharp(SRC(t)).resize(256, 256).png().toFile(DST_TILE(t));
    console.log(`  ${t}-document-tile.png`);

    // .ico from 128x128 PNG
    const png128 = await sharp(SRC(t)).resize(128, 128).png().toBuffer();
    const ico = await pngToIco([png128]);
    await writeFile(DST(t, "ico"), ico);
    console.log(`  ${t}-document.ico`);
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
