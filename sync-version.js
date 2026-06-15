import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

function syncVersion() {
  // 1. Read version from package.json
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  console.log(`Syncing version: ${version}`);

  // 2. Update src-tauri/tauri.conf.json
  const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
  if (fs.existsSync(tauriConfPath)) {
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    if (tauriConf.version !== version) {
      tauriConf.version = version;
      fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
      console.log(`Updated src-tauri/tauri.conf.json to ${version}`);
    }
  }

  // 3. Update src-tauri/Cargo.toml
  const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
  if (fs.existsSync(cargoTomlPath)) {
    let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
    const versionRegex = /^(version\s*=\s*")([^"]+)(")/m;
    if (versionRegex.test(cargoToml)) {
      cargoToml = cargoToml.replace(versionRegex, `$1${version}$3`);
      fs.writeFileSync(cargoTomlPath, cargoToml, 'utf8');
      console.log(`Updated src-tauri/Cargo.toml to ${version}`);
    }
  }
}

try {
  syncVersion();
} catch (error) {
  console.error('Failed to sync version:', error);
  process.exit(1);
}
