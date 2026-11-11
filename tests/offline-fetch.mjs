// Loaded by ch-check.mjs when EVAL_CH_OFFLINE=1. Eval runs have no network, not even
// localhost, so fetch answers from the scenario routes in-process instead of the mock server.
import { answer, loadScenarios, mergeRoutes } from './mock-server.mjs';

const routes = mergeRoutes(await loadScenarios());

process.env.COMPANIES_HOUSE_API_KEY ||= process.env.EVAL_COMPANIES_HOUSE_API_KEY || 'test-key';

globalThis.fetch = async (url, options = {}) => {
  const href = String(url);
  const { pathname, search } = new URL(href);
  const { status, headers, body } = answer(routes, pathname + search, Boolean(options.headers?.Authorization));
  if (status === 302 && options.redirect !== 'manual') {
    return globalThis.fetch(new URL(headers.location, href), { ...options, headers: {} });
  }
  return new Response(body || null, { status, headers });
};
