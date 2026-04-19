/**
 * Bump monorepo SemVer and sync workspace package.json copies.
 * Usage: node scripts/bump-version.mjs patch|minor|major
 *
 * Does NOT edit CHANGELOG.md — add the next section manually right after bumping (see docs/VERSIONING.md).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** @param {string} v @param {'patch'|'minor'|'major'} part */
function bumpSemver(v, part) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  if (!m) throw new Error(`Invalid semver: ${v}`);
  let major = Number(m[1]);
  let minor = Number(m[2]);
  let patch = Number(m[3]);
  if (part === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (part === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

const part = process.argv[2];
if (!['major', 'minor', 'patch'].includes(part ?? '')) {
  console.error('Usage: node scripts/bump-version.mjs <patch|minor|major>');
  process.exit(1);
}

const workspaces = ['apps/frontend/package.json', 'apps/backend/package.json', 'packages/shared/package.json'];

const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const prev = pkg.version;
const next = bumpSemver(String(prev), /** @type {'patch'|'minor'|'major'} */ (part));

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

for (const rel of workspaces) {
  const p = path.join(root, rel);
  try {
    const j = JSON.parse(readFileSync(p, 'utf8'));
    j.version = next;
    writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
  } catch {
    console.warn(`skip missing ${rel}`);
  }
}

console.log(`Version: ${prev} → ${next}`);
console.log('');
console.log('Next steps (required):');
console.log(`  1. Prepend CHANGELOG.md section ## [${next}] - ${new Date().toISOString().slice(0, 10)}`);
console.log('  2. Describe changes (Added / Changed / Fixed).');
console.log('  3. Build frontend so bundle picks up VITE_APP_VERSION.');
console.log(`  4. Optional: git tag -a v${next} -m "v${next}"`);
