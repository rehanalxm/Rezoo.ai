import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(__dirname, 'dist/renderer');
const rootDir = path.resolve(__dirname, '../../');

const targets = [
  path.resolve(rootDir, 'dist'),
  path.resolve(rootDir, 'renderer'),
  path.resolve(__dirname, 'renderer'),
  path.resolve(rootDir, 'packages/desktop/dist/renderer')
];

for (const target of targets) {
  try {
    if (path.resolve(target) === path.resolve(sourceDir)) continue;
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    fs.cpSync(sourceDir, target, { recursive: true });
  } catch (err) {
    console.warn('Could not copy to', target, err.message);
  }
}
console.log('✓ All output directories prepared for Vercel/Cloud deployment.');
