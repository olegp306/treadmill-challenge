import { execSync } from 'node:child_process';

const PORTS = [3001, 3002, 5173, 5174];

function isWindows() {
  return process.platform === 'win32';
}

function run(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function parseNetstatForPids(netstatOutput) {
  // Example:
  // TCP    0.0.0.0:5174     0.0.0.0:0      LISTENING       12345
  const pids = [];
  const lines = netstatOutput.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) continue;
    const localAddr = parts[1] || '';
    const state = parts[3] || '';
    const pidStr = parts[4] || '';
    if (state.toUpperCase() !== 'LISTENING') continue;
    const m = localAddr.match(/:(\d+)$/);
    if (!m) continue;
    const port = Number(m[1]);
    if (!PORTS.includes(port)) continue;
    const pid = Number(pidStr);
    if (Number.isFinite(pid) && pid > 0 && pid !== process.pid) {
      pids.push(pid);
    }
  }
  return uniq(pids);
}

function killPid(pid) {
  try {
    // /T = kill child processes, /F = force
    run(`taskkill /PID ${pid} /T /F`);
    return { pid, ok: true };
  } catch (e) {
    const stderr = e?.stderr ? String(e.stderr) : '';
    const msg = stderr.trim() || (e instanceof Error ? e.message : String(e));
    return { pid, ok: false, error: msg };
  }
}

function main() {
  if (!isWindows()) {
    console.log('dev:stop is Windows-focused; nothing to do on this OS.');
    return;
  }

  let netstat;
  try {
    netstat = run('netstat -ano -p tcp');
  } catch (e) {
    console.error('Failed to run netstat.');
    process.exit(1);
  }

  const pids = parseNetstatForPids(netstat);
  if (pids.length === 0) {
    console.log(`No listeners found on ports: ${PORTS.join(', ')}`);
    return;
  }

  console.log(`Killing listeners on ports ${PORTS.join(', ')}. PIDs: ${pids.join(', ')}`);
  const results = pids.map(killPid);
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error('Some PIDs could not be killed:');
    for (const f of failed) {
      console.error(`- PID ${f.pid}: ${f.error}`);
    }
    process.exit(1);
  }
  console.log('Done.');
}

main();

