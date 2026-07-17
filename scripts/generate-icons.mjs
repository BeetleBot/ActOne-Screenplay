import sharp from "sharp";
import { mkdir, readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const SOURCE_LIGHT = join(projectRoot, "assets/Logos And Icons/Logos/newlogo.png");
const SOURCE_DARK = join(projectRoot, "assets/Logos And Icons/Logos/newlogodark.png");

const OUTPUT_LIGHT = join(projectRoot, "src-tauri/icons/light");
const OUTPUT_DARK = join(projectRoot, "src-tauri/icons/dark");

const SIZES = [
  { size: 32, name: "32x32.png" },
  { size: 64, name: "64x64.png" },
  { size: 128, name: "128x128.png" },
  { size: 256, name: "128x128@2x.png" },
  { size: 1024, name: "icon.png" },
];

async function clean(dir) {
  if (!existsSync(dir)) return;
  const entries = await readdir(dir);
  for (const entry of entries) {
    await unlink(join(dir, entry));
  }
}

async function generateSet(source, outDir) {
  await mkdir(outDir, { recursive: true });
  await clean(outDir);

  for (const { size, name } of SIZES) {
    await sharp(source)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(outDir, name));
    console.log(`  ${name} (${size}x${size})`);
  }
}

async function main() {
  console.log("Generating light icons...");
  await generateSet(SOURCE_LIGHT, OUTPUT_LIGHT);
  console.log("Generating dark icons...");
  await generateSet(SOURCE_DARK, OUTPUT_DARK);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
