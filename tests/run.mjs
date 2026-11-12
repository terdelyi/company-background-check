#!/usr/bin/env node
// Runs skills/company-background-check/scripts/ch-check.mjs against every scenario and compares the result with its expectations.
// Usage: node tests/run.mjs [name filter]
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SCENARIO_NOW as FAKE_NOW, loadScenarios, mergeRoutes, resetFailures, startMock } from './mock-server.mjs';

const EVIDENCE_SITES = ['https://find-and-update.company-information.service.gov.uk/', 'https://www.thegazette.co.uk/notice/',
  'https://www.gov.uk/employment-tribunal-decisions/', 'https://caselaw.nationalarchives.gov.uk/',
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
// The skill evals' offline fetch must answer like the mock server. Scenarios that point a base
// URL somewhere unreachable or blank the key test failure paths it doesn't model.
const offlineScenarios = scenarios.filter(s => !s.base && !s.env);
let failed = 0;

function report(label, scenario, problems) {
  if (problems.length) {
    failed++;
    console.log(`FAIL ${label}: ${scenario.description}`);
    for (const p of problems) {
      console.log(`  - ${p}`);
    }
    if (misses.size) {
      console.log(`  answered 404 (no route in the scenario): ${[...misses].join(', ')}`);
    }
  } else {
    console.log(`ok   ${label}`);
  }
}

for (const scenario of scenarios) {
  misses.clear();
  resetFailures();
  const env = { COMPANIES_HOUSE_API_KEY: 'test-key', CH_API_BASE: scenario.base || base, CH_DOC_API_BASE: base, GAZETTE_BASE: base, GPG_BASE: base, GOVUK_BASE: base, PPR_BASE: base, CASELAW_BASE: base, CH_RETRY_MS: '0', PUBLIC_DELAY_MS: '0', FAKE_NOW, ...scenario.env };
  report(scenario.name, scenario, check(scenario, await runScript(scenario.args, env)));
}

for (const scenario of offlineScenarios) {
  misses.clear();
  const env = { EVAL_CH_OFFLINE: '1', CH_RETRY_MS: '0', PUBLIC_DELAY_MS: '0', FAKE_NOW };
  report(`${scenario.name} (offline)`, scenario, check(scenario, await runScript(scenario.args, env)));
}

server.close();
const total = scenarios.length + offlineScenarios.length;
console.log(`\n${total - failed}/${total} scenario runs passed`);
process.exitCode = failed ? 1 : 0;
