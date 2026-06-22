import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

function syncVersion() {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  console.log(`Syncing version: ${version}`);

  const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
  if (fs.existsSync(tauriConfPath)) {
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    if (tauriConf.version !== version) {
      tauriConf.version = version;
      fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
      console.log(`Updated src-tauri/tauri.conf.json to ${version}`);
    }
  }

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

  const msixVersion = version.replace(/^(\d+\.\d+\.\d+).*$/, '$1.0');
  const manifestPath = path.join(rootDir, 'winapp', 'Package.appxmanifest');
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    const msixRegex = /(Version=")([^"]+)(")/;
    if (msixRegex.test(manifest)) {
      const oldVersion = manifest.match(msixRegex)[2];
      if (oldVersion !== msixVersion) {
        manifest = manifest.replace(msixRegex, `$1${msixVersion}$3`);
        fs.writeFileSync(manifestPath, manifest, 'utf8');
        console.log(`Updated winapp/Package.appxmanifest to ${msixVersion}`);
      }
    }
  }
}

try {
  syncVersion();
} catch (error) {
  console.error('Failed to sync version:', error);
  process.exit(1);
}

