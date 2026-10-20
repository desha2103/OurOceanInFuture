import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Keep decoder binaries matched to the installed Three.js version.
const source = join('node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
const destination = join('public', 'draco');
if (!existsSync(source)) {
  console.error(`Missing Draco decoder in ${source}. Please run npm install.`);
  process.exitCode = 1;
} else {
  mkdirSync(destination, { recursive: true });
  const files = readdirSync(source).filter(name => name.endsWith('.js') || name.endsWith('.wasm'));
  for (const file of files) copyFileSync(join(source,file), join(destination,file));
  console.log(`Copied ${files.length} Draco decoder files to ${destination}`);
}
