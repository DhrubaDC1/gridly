#!/usr/bin/env node
// Unattended task queue for Antigravity CLI (agy).
// Usage (from the queue worktree root): node scripts/run-queue.js [tasks-file]
// Per task: run agy headless -> reject forbidden changes -> run gates -> commit,
// or save a patch + roll back. A failed task stops the queue (later tasks depend on it)
// unless KEEP_GOING=1. Re-running resumes: finished tasks are skipped.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TASKS_FILE = process.argv[2] || 'queue/tasks.md';
const LOG_DIR = path.resolve(ROOT, '..', 'gridly-queue-logs');
const GATES = [
  'npm test',
  // Catches broken imports/syntax in screens that unit tests never load.
  // Run it by hand once before leaving; delete this line if it fails for unrelated reasons.
  'npx expo export --platform android --output-dir /tmp/gridly-export',
];
const TIMEOUT_MIN = 40;
const KEEP_GOING = process.env.KEEP_GOING === '1';

const PREAMBLE = `You are running unattended. Nobody can answer questions, so never ask: make the most reasonable choice and continue.
Rules: JavaScript only (no TypeScript, except inside supabase/functions). Do not add, remove or upgrade packages, and do not touch package.json or package-lock.json. Follow AGENTS.md. Keep files small. Do not run git commands that change state; the runner commits for you. Never start long-running processes (no expo start, no watch mode, no dev servers); only run one-shot commands such as npm test. Run npm test before finishing. In tests, never pass React test-renderer instances or elements to expect().toBe or toEqual (a failure makes Jest serialize a huge tree and crash with out-of-memory); compare booleans, testIDs or props instead. Do not change existing rules inside src/engine unless the task explicitly says so.`;

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
const git = (...args) => (run('git', args).stdout || '').trim();
const log = (m) => console.log(`[${new Date().toLocaleTimeString()}] ${m}`);
const die = (m) => { console.error(m); process.exit(1); };

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (!branch.startsWith('queue/')) die(`Refusing to run on branch "${branch}". Use a queue/* branch in a dedicated worktree (the runner hard-resets on failure).`);
if (git('status', '--porcelain')) die('Working tree is not clean. Commit or stash first.');

fs.mkdirSync(LOG_DIR, { recursive: true });
const doneFile = path.join(LOG_DIR, 'done.json');
const done = fs.existsSync(doneFile) ? JSON.parse(fs.readFileSync(doneFile, 'utf8')) : [];
const results = path.join(LOG_DIR, 'RESULTS.md');

const parts = fs.readFileSync(TASKS_FILE, 'utf8').split(/^=== TASK: (.+) ===$/m);
const tasks = [];
for (let i = 1; i < parts.length; i += 2) tasks.push({ name: parts[i].trim(), body: parts[i + 1].trim() });

function check(logFile, id) {
  run('git', ['add', '-A']);
  const changed = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
  if (!changed.length) return 'agent made no changes';
  if (changed.some((f) => f === 'package.json' || f === 'package-lock.json')) return 'touched package.json or lockfile';
  if (changed.some((f) => /\.tsx?$/.test(f) && !f.startsWith('supabase/'))) return 'created a TypeScript file';
  for (const gate of GATES) {
    const r = run('sh', ['-c', gate]);
    fs.appendFileSync(logFile, `\n\n===== GATE: ${gate} (exit ${r.status}) =====\n${r.stdout}\n${r.stderr}`);
    if (r.status !== 0) return `gate failed: ${gate}`;
  }
  return null;
}

let n = 0;
for (const t of tasks) {
  n++;
  if (done.includes(t.name)) { log(`skip (done): ${t.name}`); continue; }
  const id = `${String(n).padStart(2, '0')}-${t.name}`;
  const logFile = path.join(LOG_DIR, `${id}.log`);
  const fd = fs.openSync(logFile, 'w');
  const started = Date.now();
  log(`start: ${t.name}`);

  // stdin detached on purpose: headless agy can drop output when attached to a pipe/terminal.
  run('agy', ['--dangerously-skip-permissions', '--print-timeout', `${TIMEOUT_MIN}m`, '-p', `${PREAMBLE}\n\n${t.body}`], {
    stdio: ['ignore', fd, fd],
    timeout: (TIMEOUT_MIN + 3) * 60000,
    killSignal: 'SIGKILL',
  });
  fs.closeSync(fd);

  const problem = check(logFile, id);
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  if (!problem) {
    run('git', ['commit', '-q', '-m', `queue: ${t.name}`]);
    done.push(t.name);
    fs.writeFileSync(doneFile, JSON.stringify(done, null, 2));
    fs.appendFileSync(results, `- OK     ${t.name} (${mins} min)\n`);
    log(`ok: ${t.name} (${mins} min)`);
    continue;
  }
  fs.writeFileSync(path.join(LOG_DIR, `${id}.patch`), run('git', ['diff', '--cached']).stdout || '');
  run('git', ['reset', '--hard', 'HEAD']);
  run('git', ['clean', '-fd']);
  fs.appendFileSync(results, `- FAILED ${t.name} (${mins} min): ${problem}\n`);
  log(`FAILED: ${t.name}: ${problem}`);
  if (!KEEP_GOING) break;
}

log(`finished. See ${results}`);
run('osascript', ['-e', 'display notification "Task queue finished" with title "Gridly"']);
