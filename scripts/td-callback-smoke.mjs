#!/usr/bin/env node
/**
 * Smoke-test TouchDesigner finish callback endpoint.
 *
 * Examples:
 *  node scripts/td-callback-smoke.mjs --runSessionId abc --resultTime 312.5 --distance 1000
 *  node scripts/td-callback-smoke.mjs --runSessionId abc --resultTime 312.5 --distance 1000 --token secret
 */

function parseArgs(argv) {
  const out = {
    baseUrl: 'http://localhost:3001',
    runSessionId: '',
    resultTime: NaN,
    distance: NaN,
    token: '',
    autoFromQueue: false,
    runTypeId: NaN,
    sex: '',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--baseUrl') out.baseUrl = argv[++i] ?? out.baseUrl;
    else if (a === '--runSessionId') out.runSessionId = argv[++i] ?? '';
    else if (a === '--resultTime') out.resultTime = Number(argv[++i]);
    else if (a === '--distance') out.distance = Number(argv[++i]);
    else if (a === '--token') out.token = argv[++i] ?? '';
    else if (a === '--autoFromQueue') out.autoFromQueue = true;
    else if (a === '--runTypeId') out.runTypeId = Number(argv[++i]);
    else if (a === '--sex') out.sex = String(argv[++i] ?? '');
  }
  return out;
}

function usage() {
  console.log(
    'Usage: npm run td:callback:smoke -- --runSessionId <id> --resultTime <sec> --distance <meters> [--token <token>] [--baseUrl http://localhost:3001]'
  );
  console.log(
    '   or: npm run td:callback:smoke -- --autoFromQueue --resultTime <sec> --distance <meters> [--runTypeId 0|1|2] [--sex male|female] [--token <token>]'
  );
}

const args = parseArgs(process.argv.slice(2));
if (!Number.isFinite(args.resultTime) || !Number.isFinite(args.distance)) {
  usage();
  process.exit(1);
}

const normalizedBaseUrl = args.baseUrl.replace(/\/$/, '');

async function resolveRunSessionIdFromQueue() {
  const q = new URLSearchParams();
  if (Number.isFinite(args.runTypeId) && (args.runTypeId === 0 || args.runTypeId === 1 || args.runTypeId === 2)) {
    q.set('runTypeId', String(args.runTypeId));
  }
  if (args.sex === 'male' || args.sex === 'female') {
    q.set('sex', args.sex);
  }
  const queueUrl = `${normalizedBaseUrl}/api/run/queue${q.toString() ? `?${q.toString()}` : ''}`;
  console.log(`[TD callback smoke] GET ${queueUrl}`);
  const res = await fetch(queueUrl);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Queue request failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  if (!entries.length) {
    throw new Error('Queue is empty, no runSessionId to use.');
  }
  const running = entries.find((e) => e && e.status === 'running');
  const firstQueued = entries
    .filter((e) => e && e.status === 'queued')
    .sort((a, b) => Number(a.queueNumber ?? 0) - Number(b.queueNumber ?? 0))[0];
  const chosen = running ?? firstQueued ?? entries[0];
  if (!chosen?.runSessionId) {
    throw new Error('Unable to resolve runSessionId from queue response.');
  }
  return String(chosen.runSessionId);
}

let runSessionId = args.runSessionId.trim();
if (args.autoFromQueue) {
  runSessionId = await resolveRunSessionIdFromQueue();
  console.log(`[TD callback smoke] auto-selected runSessionId: ${runSessionId}`);
}

if (!runSessionId) {
  usage();
  process.exit(1);
}

const url = `${normalizedBaseUrl}/api/touchdesigner/run-result`;
const body = {
  runSessionId,
  resultTime: args.resultTime,
  distance: args.distance,
};
const headers = {
  'Content-Type': 'application/json',
};
if (args.token) {
  headers['X-TD-Token'] = args.token;
}

console.log(`[TD callback smoke] POST ${url}`);
console.log(`[TD callback smoke] body: ${JSON.stringify(body)}`);

const res = await fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify(body),
});
const text = await res.text();
console.log(`[TD callback smoke] status: ${res.status}`);
console.log(`[TD callback smoke] response: ${text}`);

if (!res.ok) process.exit(2);
