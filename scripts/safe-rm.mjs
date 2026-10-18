#!/usr/bin/env node
// The only way files get deleted in this repo (owner rule, D-084). It prints each resolved absolute path before
// touching it and refuses anything outside the repo, the repo root itself, and .git.
//   node scripts/safe-rm.mjs [-r] <path> [<path> ...]      (or: pnpm safe-rm [-r] <path> ...)
// -r is needed to delete a directory. Every path is checked before anything is deleted: one bad path, nothing goes.
import { lstatSync, realpathSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const base = process.env.INIT_CWD ?? process.cwd(); // pnpm runs scripts from the root; resolve against where it was typed
const args = process.argv.slice(2);
const recursive = args.includes('-r');
const targets = args.filter((a) => a !== '-r');
const norm = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);

function check(input) {
  const abs = resolve(base, input);
  console.log(`safe-rm: ${abs}`);
  let st;
  try {
    st = lstatSync(abs);
  } catch {
    return `does not exist`;
  }
  // Resolve the parent's real path (a symlinked folder can't smuggle the target out of the repo); the entry itself is
  // removed as a link, never followed.
  const real = resolve(realpathSync(dirname(abs)), abs.slice(dirname(abs).length + 1));
  const rel = relative(norm(ROOT), norm(real));
  if (rel === '') return 'refused: that is the repo root';
  if (rel.startsWith('..') || isAbsolute(rel)) return `refused: outside the repo (${ROOT})`;
  if (rel.split(sep)[0] === '.git') return 'refused: inside .git';
  if (st.isDirectory() && !recursive) return 'refused: a directory (pass -r)';
  return null;
}

if (!targets.length) {
  console.error('usage: node scripts/safe-rm.mjs [-r] <path> [<path> ...]');
  process.exit(2);
}
const problems = targets.map((t) => [t, check(t)]).filter(([, p]) => p);
if (problems.length) {
  for (const [t, p] of problems) console.error(`safe-rm: ${t}: ${p}`);
  console.error('safe-rm: nothing deleted');
  process.exit(1);
}
for (const t of targets) {
  rmSync(resolve(base, t), { recursive, force: false });
  console.log(`safe-rm: deleted ${resolve(base, t)}`);
}
