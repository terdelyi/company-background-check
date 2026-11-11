#!/usr/bin/env node
// Runs skills/company-background-check/scripts/ch-check.mjs against every scenario and compares the result with its expectations.
// Usage: node tests/run.mjs [name filter]
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadScenarios, mergeRoutes, startMock } from './mock-server.mjs';

const FAKE_NOW = '2026-06-01T12:00:00Z';
const EVIDENCE_SITES = ['https://find-and-update.company-information.service.gov.uk/', 'https://www.thegazette.co.uk/notice/',
  'https://www.gov.uk/employment-tribunal-decisions/',
];
const script = fileURLToPath(new URL('../skills/company-background-check/scripts/ch-check.mjs', import.meta.url));
const freezeTime = new URL('./freeze-time.mjs', import.meta.url).href;

function runScript(args, env) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--import', freezeTime, script, ...args], { env: { ...process.env, ...env } });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

const valueAt = (obj, path) => path.split('.').reduce((v, k) => v?.[k], obj);

function check(scenario, { code, stdout, stderr }) {
  const { expect } = scenario;
  const problems = [];
  if (code !== expect.exit) {
    problems.push(`exit ${code}, expected ${expect.exit}${stderr ? ` (stderr: ${stderr.trim()})` : ''}`);
  }
  if (expect.stderr && !stderr.includes(expect.stderr)) {
    problems.push(`stderr lacks "${expect.stderr}": ${stderr.trim()}`);
  }
  if (!expect.flags && !expect.fields) {
    return problems;
  }

  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    return [...problems, 'stdout is not JSON'];
  }
  if (expect.flags) {
    const actual = (report.flags || []).map(f => `${f.severity} ${f.code}`).sort();
    const wanted = [...expect.flags].sort();
    if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
      problems.push(`flags\n      got:      ${JSON.stringify(actual)}\n      expected: ${JSON.stringify(wanted)}`);
    }
    for (const f of report.flags || []) {
      if (!EVIDENCE_SITES.some(site => f.url?.startsWith(site))) {
        problems.push(`flag ${f.code} has no public-register evidence URL: ${f.url}`);
      }
    }
  }
  for (const [path, wanted] of Object.entries(expect.fields || {})) {
    const actual = valueAt(report, path);
    if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
      problems.push(`${path} is ${JSON.stringify(actual)}, expected ${JSON.stringify(wanted)}`);
    }
  }
  return problems;
}

const filter = process.argv[2] || '';
const scenarios = (await loadScenarios()).filter(s => s.name.includes(filter));
const { server, misses, base } = await startMock(mergeRoutes(scenarios));
let failed = 0;

for (const scenario of scenarios) {
  misses.clear();
  const env = { COMPANIES_HOUSE_API_KEY: 'test-key', CH_API_BASE: scenario.base || base, CH_DOC_API_BASE: base, GAZETTE_BASE: base, GPG_BASE: base, GOVUK_BASE: base, CH_RETRY_MS: '0', FAKE_NOW, ...scenario.env };
  const problems = check(scenario, await runScript(scenario.args, env));
  if (problems.length) {
    failed++;
    console.log(`FAIL ${scenario.name}: ${scenario.description}`);
    for (const p of problems) {
      console.log(`  - ${p}`);
    }
    if (misses.size) {
      console.log(`  answered 404 (no route in the scenario): ${[...misses].join(', ')}`);
    }
  } else {
    console.log(`ok   ${scenario.name}`);
  }
}

server.close();
console.log(`\n${scenarios.length - failed}/${scenarios.length} scenarios passed`);
process.exitCode = failed ? 1 : 0;
