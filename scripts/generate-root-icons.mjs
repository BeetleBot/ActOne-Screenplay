import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile, copyFile } from "fs/promises";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const SOURCE = join(projectRoot, "assets/Logos And Icons/Logos/newlogo.png");
const ICONS_DIR = join(projectRoot, "src-tauri/icons");
const SIZES = [
  { size: 32, name: "32x32.png" },
  { size: 64, name: "64x64.png" },
  { size: 128, name: "128x128.png" },
  { size: 256, name: "128x128@2x.png" },
  { size: 1024, name: "icon.png" },
];

const TILES = [
  { size: 30, name: "Square30x30Logo.png" },
  { size: 44, name: "Square44x44Logo.png" },
  { size: 71, name: "Square71x71Logo.png" },
  { size: 89, name: "Square89x89Logo.png" },
  { size: 107, name: "Square107x107Logo.png" },
  { size: 142, name: "Square142x142Logo.png" },
  { size: 150, name: "Square150x150Logo.png" },
  { size: 284, name: "Square284x284Logo.png" },
  { size: 310, name: "Square310x310Logo.png" },
  { size: 310, name: "Wide310x150Logo.png", wide: true },
  { size: 50, name: "StoreLogo.png" },
];

async function main() {
  // 1. Main app icons
  for (const { size, name } of SIZES) {
    await sharp(SOURCE)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(ICONS_DIR, name));
    console.log(`  ${name} (${size}x${size})`);
  }

  // 2. icon.ico (contains 128x128 PNG)
  const png128 = await sharp(SOURCE)
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const icoBuffer = await pngToIco([png128]);
  await writeFile(join(ICONS_DIR, "icon.ico"), icoBuffer);
  console.log("  icon.ico");

  // 3. Windows tile images
  for (const { size, name, wide } of TILES) {
    const w = wide ? 310 : size;
    const h = wide ? 150 : size;
    await sharp(SOURCE)
      .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(ICONS_DIR, name));
    console.log(`  ${name} (${w}x${h})`);
  }

  // 4. Copy tile images to gen/windows/Assets/ for MSIX packaging
  const WIN_ASSETS = join(projectRoot, "src-tauri/gen/windows/Assets");
  for (const f of ["Square150x150Logo.png", "Square44x44Logo.png", "StoreLogo.png", "Wide310x150Logo.png"]) {
    await copyFile(join(ICONS_DIR, f), join(WIN_ASSETS, f));
    console.log(`  -> gen/windows/Assets/${f}`);
  }

  console.log("Done - all icons updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
