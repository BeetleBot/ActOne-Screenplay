import { copyFile, mkdir } from 'node:fs/promises';
const name = 'actone' + (process.platform === 'win32' ? '.exe' : '');
await mkdir('node_modules/.desktop-app', { recursive: true });
await copyFile(`src-tauri/target/debug/${name}`, `node_modules/.desktop-app/${name}`);
