import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendSrcDir = path.join(rootDir, 'apps', 'frontend', 'src');
const forbiddenExtensions = new Set(['.js', '.jsx']);

async function collectForbiddenFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectForbiddenFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && forbiddenExtensions.has(path.extname(entry.name))) {
      files.push(path.relative(rootDir, fullPath).replaceAll(path.sep, '/'));
    }
  }

  return files;
}

const forbiddenFiles = await collectForbiddenFiles(frontendSrcDir);

if (forbiddenFiles.length > 0) {
  console.error('Unexpected JavaScript files were found in apps/frontend/src.');
  console.error('This source tree is TypeScript-only; stray .js files can shadow .ts imports in Vite builds.');
  console.error('Remove these files and build from a clean checkout:');
  for (const file of forbiddenFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}
