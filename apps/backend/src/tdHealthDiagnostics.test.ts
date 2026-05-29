import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import {
  readTdHealthDiagnosticsForPath,
  resolveTdHealthFilePathFromSources,
} from './services/healthAggregator.js';

test('resolveTdHealthFilePathFromSources prefers admin setting over env and resolves relative paths', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'td-health-path-'));
  try {
    const cwd = path.join(tmp, 'app');
    const resolved = resolveTdHealthFilePathFromSources({
      adminSetting: 'runtime/custom/TDHealth.json',
      envValue: 'runtime/env/TDHealth.json',
      cwd,
    });

    assert.equal(resolved.source, 'admin_setting');
    assert.equal(resolved.configuredValue, 'runtime/custom/TDHealth.json');
    assert.equal(resolved.path, path.resolve(cwd, 'runtime/custom/TDHealth.json'));
    assert.equal(resolved.cwd, cwd);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('readTdHealthDiagnosticsForPath reports parsed JSON health file details', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'td-health-diag-'));
  try {
    const filePath = path.join(tmp, 'TDHealth.json');
    await writeFile(filePath, JSON.stringify({ fps: 59, treadmillOnline: true }), 'utf8');

    const diagnostics = await readTdHealthDiagnosticsForPath({
      path: filePath,
      source: 'admin_setting',
      configuredValue: filePath,
      cwd: tmp,
    });

    assert.equal(diagnostics.exists, true);
    assert.equal(diagnostics.readable, true);
    assert.equal(diagnostics.parseOk, true);
    assert.deepEqual(diagnostics.jsonKeys.sort(), ['fps', 'treadmillOnline']);
    assert.equal(diagnostics.error, null);
    assert.equal(diagnostics.path, filePath);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
