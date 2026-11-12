#!/usr/bin/env node
// Serves the routes of every scenario in tests/scenarios as a fake Companies House API.
// Usage: node tests/mock-server.mjs [port]   (default 8787)
import { createServer } from 'node:http';
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Paging params are ignored so fixtures stay short; these are the ones that change the answer.
const KEY_PARAMS = ['q', 'category', 'text', 'query'];
// The real Gazette, gov.uk and Find Case Law searches answer a search with no hits with 200 and no entries, not 404.
const GAZETTE_NO_HITS = { 'f:total': '0' };
const GOVUK_NO_HITS = { results: [], total: 0 };
const CASELAW_NO_HITS = '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>';
export const PAYMENT_PRACTICES_HEADER = 'Report Id,Start date,End date,Filing date,Company,Company number,Average time to pay,% Invoices paid within 30 days,% Invoices paid between 31 and 60 days,% Invoices paid later than 60 days,% Invoices not paid within agreed terms';
// Scenario dates are written relative to this day, so every run sees the same ages and deadlines.
export const SCENARIO_NOW = '2026-06-01T12:00:00Z';

export function routeKey(url) {
  const u = new URL(url, 'http://mock');
  const params = KEY_PARAMS.filter(p => u.searchParams.has(p)).map(p => `${p}=${u.searchParams.get(p)}`);
  return u.pathname + (params.length ? `?${params.join('&')}` : '');
}

export async function loadScenarios(dir = new URL('./scenarios/', import.meta.url)) {
  const files = (await readdir(dir)).filter(f => f.endsWith('.mjs') && !f.startsWith('_')).sort();
  return Promise.all(files.map(async f => ({ name: f.replace(/\.mjs$/, ''), ...(await import(new URL(f, dir))).default })));
}

export function mergeRoutes(scenarios) {
  const routes = new Map();
  for (const s of scenarios) {
    for (const [key, body] of Object.entries(s.routes || {})) {
      if (routes.has(key) && JSON.stringify(routes.get(key)) !== JSON.stringify(body)) {
        throw new Error(`Route ${key} is defined differently in ${s.name}`);
      }
      routes.set(key, body);
    }
  }
  return routes;
}

const failedCalls = new Map();

export function resetFailures() {
  failedCalls.clear();
}

/** @returns {{ status: number, headers: Record<string, string>, body: string, miss?: string }} */
export function answer(routes, url, hasAuth) {
  const key = routeKey(url);
  if (!routes.has(key) && key.startsWith('/all-notices/')) {
    return { status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(GAZETTE_NO_HITS) };
  }
  if (!routes.has(key) && key.startsWith('/api/search.json')) {
    return { status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(GOVUK_NO_HITS) };
  }
  if (!routes.has(key) && key.startsWith('/atom.xml')) {
    return { status: 200, headers: { 'content-type': 'application/atom+xml' }, body: CASELAW_NO_HITS };
  }
  if (!routes.has(key) && key === '/export/csv/') {
    return { status: 200, headers: { 'content-type': 'text/csv' }, body: `${PAYMENT_PRACTICES_HEADER}\n` };
  }
  if (!routes.has(key)) {
    return { status: 404, headers: {}, body: '', miss: key };
  }
  let route = routes.get(key);
  if (route.failFirst !== undefined) {
    // { failFirst: n, failStatus?, then: route } fails n times (503 unless given), like a service having a bad moment
    const calls = (failedCalls.get(key) || 0) + 1;
    failedCalls.set(key, calls);
    if (calls <= route.failFirst) {
      return { status: route.failStatus ?? 503, headers: {}, body: '' };
    }
    route = route.then;
  }
  if (route.redirect) {
    return { status: 302, headers: { location: route.redirect }, body: '' };
  }
  if (route.csv !== undefined) {
    return { status: 200, headers: { 'content-type': 'text/csv' }, body: route.csv };
  }
  if (route.xml !== undefined) {
    return { status: 200, headers: { 'content-type': 'application/atom+xml' }, body: route.xml };
  }
  if (route.storage !== undefined) {
    // like the signed storage URLs the Document API redirects to, which refuse a second auth header
    const status = hasAuth ? 400 : 200;
    return { status, headers: { 'content-type': 'application/xhtml+xml' }, body: status === 200 ? route.storage : '' };
  }
  return { status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(route) };
}

export function startMock(routes, port = 0) {
  const misses = new Set();
  const server = createServer((req, res) => {
    const { status, headers, body, miss } = answer(routes, req.url, Boolean(req.headers.authorization));
    if (miss) {
      misses.add(miss);
    }
    res.writeHead(status, headers).end(body);
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => {
    resolve({ server, misses, base: `http://127.0.0.1:${server.address().port}` });
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { base } = await startMock(mergeRoutes(await loadScenarios()), Number(process.argv[2] || 8787));
  console.log(`Mock Companies House API on ${base}`);
}
