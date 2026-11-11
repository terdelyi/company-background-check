#!/usr/bin/env node
// Serves the routes of every scenario in tests/scenarios as a fake Companies House API.
// Usage: node tests/mock-server.mjs [port]   (default 8787)
import { createServer } from 'node:http';
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Paging params are ignored so fixtures stay short; these are the ones that change the answer.
const KEY_PARAMS = ['q', 'category', 'text'];
// The real Gazette answers a search with no hits with 200 and no entries, not 404.
const GAZETTE_NO_HITS = { 'f:total': '0' };

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

export function startMock(routes, port = 0) {
  const misses = new Set();
  const server = createServer((req, res) => {
    const key = routeKey(req.url);
    if (!routes.has(key) && key.startsWith('/all-notices/')) {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(GAZETTE_NO_HITS));
      return;
    }
    if (!routes.has(key)) {
      misses.add(key);
      res.writeHead(404).end();
      return;
    }
    const route = routes.get(key);
    if (route.redirect) {
      res.writeHead(302, { location: route.redirect }).end();
    } else if (route.csv !== undefined) {
      res.writeHead(200, { 'content-type': 'text/csv' }).end(route.csv);
    } else if (route.storage !== undefined) {
      // like the signed storage URLs the Document API redirects to, which refuse a second auth header
      const status = req.headers.authorization ? 400 : 200;
      res.writeHead(status, { 'content-type': 'application/xhtml+xml' }).end(status === 200 ? route.storage : '');
    } else {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(route));
    }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => {
    resolve({ server, misses, base: `http://127.0.0.1:${server.address().port}` });
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { base } = await startMock(mergeRoutes(await loadScenarios()), Number(process.argv[2] || 8787));
  console.log(`Mock Companies House API on ${base}`);
}
