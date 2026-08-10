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

  const metainfoPath = path.join(rootDir, 'flatpak', 'ink.iyal.actone.metainfo.xml');
  if (fs.existsSync(metainfoPath)) {
    let metainfo = fs.readFileSync(metainfoPath, 'utf8');
    const today = new Date().toISOString().split('T')[0];
    metainfo = metainfo.replace(/<release version="[^"]*" date="[^"]*"/, `<release version="${version}" date="${today}"`);
    fs.writeFileSync(metainfoPath, metainfo, 'utf8');
    console.log(`Updated flatpak/ink.iyal.actone.metainfo.xml to ${version} (${today})`);
  }

}

try {
  syncVersion();
} catch (error) {
  console.error('Failed to sync version:', error);
  process.exit(1);
}

