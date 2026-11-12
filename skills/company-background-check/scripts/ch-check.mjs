#!/usr/bin/env node
// Companies House background check. Node 18+, no dependencies.
// Usage: COMPANIES_HOUSE_API_KEY=... node ch-check.mjs "<company number or name>" [--aka "Brand, Product name"]
// Exit: 0 = JSON report on stdout | 2 = no key / API unreachable | 3 = ambiguous name (candidates on stdout)
// Skill evals run without network, so they answer requests from the repo's test fixtures instead.
if (process.env.EVAL_CH_OFFLINE === '1') await import(new URL('../../../tests/offline-fetch.mjs', import.meta.url));
const KEY = process.env.COMPANIES_HOUSE_API_KEY;
const BASE = process.env.CH_API_BASE || 'https://api.company-information.service.gov.uk';
const DOC_BASE = process.env.CH_DOC_API_BASE || 'https://document-api.company-information.service.gov.uk';
const SITE = 'https://find-and-update.company-information.service.gov.uk';
const MAX_DIRECTORS = 15, MAX_PROFILE_LOOKUPS = 60, MAX_HISTORY_LOOKUPS = 40, PHOENIX_WINDOW_MONTHS = 36, CYCLE_LOOKBACK_MONTHS = 120;
const ACCOUNTS_FILINGS = 5, MIN_HEADCOUNT_FOR_TREND = 5, LEFT_BEFORE_FAILURE_MONTHS = 12;
const GAZETTE_BASE = process.env.GAZETTE_BASE || 'https://www.thegazette.co.uk', GAZETTE_SITE = 'https://www.thegazette.co.uk';
// corporate insolvency notices; 2450 is a petition to wind up
const GAZETTE_CATEGORY = 'G205010000', PETITION_CODE = '2450', MAX_GAZETTE_NOTICES = 10, GAZETTE_LOOKBACK_MONTHS = 60, PETITION_WINDOW_MONTHS = 24;
const GPG_BASE = process.env.GPG_BASE || 'https://gender-pay-gap.service.gov.uk', GPG_SITE = 'https://gender-pay-gap.service.gov.uk', GPG_YEARS = 4;
const GOVUK_BASE = process.env.GOVUK_BASE || 'https://www.gov.uk', GOVUK_SITE = 'https://www.gov.uk';
const SPONSOR_REGISTER_PAGE = '/government/publications/register-of-licensed-sponsors-workers', TRIBUNAL_LOOKBACK_MONTHS = 72, MAX_FAILED_COMPANY_TRIBUNAL_SEARCHES = 10;
const MAX_PARENT_LEVELS = 3;
const USER_AGENT = 'company-background-check/1.0.0 (+https://github.com/terdelyi/company-background-check)';
// tests set this to 0 so the pauses between public requests don't slow them down
const PUBLIC_DELAY_MS = Number(process.env.PUBLIC_DELAY_MS ?? 1000);
const UK_REGISTER = /england|wales|scotland|northern ireland|united kingdom|great britain|\buk\b|companies house|registrar of companies/i;
// iXBRL concept names by local name, preferred first; older UK GAAP filings use the later ones
const ACCOUNT_CONCEPTS = {
  net_assets: ['NetAssetsLiabilities', 'NetAssetsLiabilitiesIncludingPensionAssetLiability', 'Equity', 'ShareholderFunds'],
  cash: ['CashBankOnHand', 'CashBankInHand'],
  employees: ['AverageNumberEmployeesDuringPeriod', 'EmployeesTotal'],
  turnover: ['TurnoverRevenue', 'TurnoverGrossOperatingRevenue', 'Turnover'],
  net_current_assets: ['NetCurrentAssetsLiabilities'],
  profit: ['ProfitLoss', 'ProfitLossOnOrdinaryActivitiesAfterTax'],
  staff_costs: ['StaffCostsEmployeeBenefitsExpense', 'StaffCosts', 'WagesSalaries'],
};
const INSOLVENT = ['liquidation', 'administration', 'receivership', 'insolvency-proceedings', 'voluntary-arrangement'];
const STOP = new Set(['ltd', 'limited', 'plc', 'llp', 'the', 'and', 'company', 'group', 'holdings', 'services', 'solutions', 'international', 'global',
  'software', 'systems', 'technology', 'technologies', 'digital', 'consulting', 'consultancy', 'trading', 'management', 'enterprises', 'associates', 'partners']);

let requests = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = (code, msg) => { console.error(msg); process.exit(code); };

const auth = () => ({ Authorization: 'Basic ' + Buffer.from(KEY + ':').toString('base64') });

async function get(path, attempt = 0) {
  requests++;
  let res;
  try {
    res = await fetch(BASE + path, { headers: auth() });
  } catch (e) { fail(2, `API unreachable: ${e.cause?.code || e.message}`); }
  if (res.status === 404) return null;
  if (res.status === 429 && attempt < 5) { await sleep(Number(process.env.CH_RETRY_MS || 60000)); return get(path, attempt + 1); }
  if (!res.ok) fail(2, `API error ${res.status} on ${path}`);
  return res.json();
}

// Document API failures only cost the accounts figures, so they return null instead of ending the run.
async function getDocument(url, accept) {
  requests++;
  try {
    let res = await fetch(url, { headers: { ...auth(), Accept: accept }, redirect: 'manual' });
    // content redirects to a signed storage URL that rejects a second auth header
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) res = await fetch(new URL(res.headers.get('location'), url), { headers: { Accept: accept } });
    if (!res.ok) return null;
    return accept === 'application/json' ? await res.json() : await res.text();
  } catch { return null; }
}

async function accountsDocument(metadataUrl) {
  const docPath = new URL(metadataUrl, DOC_BASE).pathname;
  const meta = await getDocument(DOC_BASE + docPath, 'application/json');
  const types = Object.keys(meta?.resources || {});
  if (!types.includes('application/xhtml+xml')) return { format: types.includes('application/pdf') ? 'pdf' : 'unavailable' };
  const text = await getDocument(`${DOC_BASE}${docPath}/content`, 'application/xhtml+xml');
  return text ? { format: 'ixbrl', text } : { format: 'unavailable' };
}

function ixNumber(raw, format = '', scale = '0', sign) {
  const text = raw.replace(/<[^>]+>/g, '').trim();
  if (/zero/i.test(format) || /^[-–—]$/.test(text)) return 0;
  const decimalComma = /comma-?decimal/i.test(format);
  const digits = text.replace(decimalComma ? /[^\d,]/g : /[^\d.]/g, '').replace(',', '.');
  if (!digits) return null;
  const n = Number(digits) * 10 ** Number(scale || 0);
  return sign === '-' ? -n : n;
}

// { 'YYYY-MM-DD period end': { net_assets, cash, employees, turnover } } from entity-level facts only
function parseIxbrl(doc) {
  const periodEnd = new Map();
  for (const m of doc.matchAll(/<(?:[\w-]+:)?context\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?context>/g)) {
    if (/<(?:[\w-]+:)?segment\b/.test(m[2])) continue; // dimensional breakdowns, not company totals
    const end = m[2].match(/<(?:[\w-]+:)?(?:instant|endDate)>\s*([\d-]+)\s*</);
    if (end) periodEnd.set(m[1], end[1]);
  }
  const periods = new Map(), ranks = new Map();
  for (const m of doc.matchAll(/<ix:nonFraction\b([^>]*)>([\s\S]*?)<\/ix:nonFraction>/g)) {
    const attr = name => m[1].match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
    const local = (attr('name') || '').split(':').pop();
    const field = Object.keys(ACCOUNT_CONCEPTS).find(f => ACCOUNT_CONCEPTS[f].includes(local));
    const end = periodEnd.get(attr('contextRef'));
    let value = field && end ? ixNumber(m[2], attr('format'), attr('scale'), attr('sign')) : null;
    if (value === null) continue;
    // some filing software puts sign="-" on the headcount, which can never be negative
    if (field === 'employees') value = Math.abs(value);
    const rank = ACCOUNT_CONCEPTS[field].indexOf(local), key = `${end} ${field}`;
    if (ranks.has(key) && ranks.get(key) <= rank) continue;
    ranks.set(key, rank);
    periods.set(end, { ...periods.get(end), [field]: value });
  }
  return periods;
}

// Clean audit reports say they found no material uncertainty, so a negated sentence does not count.
function reportsGoingConcernDoubt(doc) {
  const text = doc.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
  return text.split(/(?<=[.!?])\s+/).some(s => /material uncertaint/i.test(s) && /going concern/i.test(s) && !/\b(no|not|any)\b[^.]*material uncertaint/i.test(s));
}
const money = n => `${n < 0 ? '-' : ''}£${Math.abs(n).toLocaleString('en-GB')}`;

// The Gazette and gov.uk registers are separate services: a failure only loses that check, never the run.
// Dropped connections are common on these services and a retry usually succeeds.
async function getPublic(url, accept = 'application/json') {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(PUBLIC_DELAY_MS * 2 ** attempt);
    requests++;
    try {
      const res = await fetch(url, { headers: { Accept: accept, 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20000) });
      if (res.ok) return await res.text();
      if (res.status !== 429 && res.status < 500) return null;
    } catch { /* retry */ }
  }
  return null;
}
// The Gazette's fair use policy allows 5 requests per 10 seconds.
let lastGazetteRequest = 0;
async function getGazette(path) {
  const wait = lastGazetteRequest + 2 * PUBLIC_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastGazetteRequest = Date.now();
  return getPublic(GAZETTE_BASE + path);
}

// A members' voluntary liquidation comes with a declaration of solvency: groups use it to close
// subsidiaries they no longer need, so it is not the insolvency the phoenix and insolvency checks look for.
const isSolventWindUp = cases => Array.isArray(cases) && cases.length > 0 && cases.every(x => x.type === 'members-voluntary-liquidation');
// A company can be wound up years before it is finally dissolved, so its failure dates from the first step of a case.
const insolvencyStart = cases => (cases || []).flatMap(x => x.dates || [])
  .filter(d => d.date && !/ended|concluded|dissolved|discharged|terminated/.test(d.type || '')).map(d => d.date).sort()[0] || null;

// Register checks that matter for any company in the group: the target and each parent.
function registerFlags(co, num, insolvency, filingItems) {
  const out = [], add = (severity, code, text, url = `${SITE}/company/${num}`) => out.push({ severity, code, text, url });
  const filingsUrl = `${SITE}/company/${num}/filing-history`;
  const solvent = isSolventWindUp(insolvency?.cases);
  if (co.company_status !== 'active') add('high', 'status', `Company status is "${co.company_status}"${solvent ? ' (members\' voluntary liquidation: a solvent wind-up, the company is still closing)' : ''}`);
  if (co.accounts?.overdue) add('high', 'accounts_overdue', `Accounts overdue (were due ${co.accounts.next_due || 'unknown'})`);
  if (co.confirmation_statement?.overdue) add('medium', 'confirmation_overdue', `Confirmation statement overdue (was due ${co.confirmation_statement.next_due || 'unknown'})`);
  if (!solvent && (co.has_insolvency_history || insolvency?.cases?.length)) add('high', 'insolvency', `Insolvency history: ${(insolvency?.cases || []).map(x => x.type).join(', ') || 'yes'}`, `${SITE}/company/${num}/insolvency`);
  if (co.registered_office_is_in_dispute) add('high', 'office_disputed', 'Registered office address is in dispute');
  if (co.undeliverable_registered_office_address) add('high', 'office_undeliverable', 'Registered office address is undeliverable');
  for (const f of (filingItems || []).filter(f => f.date && monthsAgo(f.date) <= 24)) {
    const d = f.description || '';
    if (d.startsWith('gazette-notice-compulsory')) add('high', 'strike_off_notice', `Compulsory strike-off notice on ${f.date} (usually missed filings)`, filingsUrl);
    else if (d.startsWith('gazette-notice-voluntary')) add('high', 'voluntary_strike_off', `Voluntary strike-off application on ${f.date}`, filingsUrl);
    else if (d.includes('strike-off-suspended')) add('medium', 'strike_off_suspended', `Strike-off action suspended on ${f.date}`, filingsUrl);
  }
  // lengthening the financial year pushes back the date the next accounts are due, which can delay bad news
  const extensions = (filingItems || []).filter(f => f.type === 'AA01' && /extended/.test(f.description || '') && f.date && monthsAgo(f.date) <= 60);
  if (extensions.length) add(extensions.length >= 2 ? 'medium' : 'low', 'year_end_extended', `Financial year extended ${extensions.length} time${extensions.length > 1 ? 's' : ''} in the last 5 years (${extensions.map(f => `${f.date} to a year end of ${f.description_values?.new_date || 'unknown'}`).join(' and ')}), which delays the next accounts`, filingsUrl);
  return out;
}

// A petition reaches the Gazette weeks before Companies House records anything.
// Search finds notices by name; only a notice that carries the company number becomes a flag.
const searchName = n => n.replace(/[\s,]+(limited|ltd\.?|plc|llp)$/i, '').trim();
// Registered names are upper case and brands mixed case, so "HEALTHBOX" and "HealthBox" are one search
const uniqueSearchNames = coNames => {
  const seen = new Set();
  return coNames.map(searchName).filter(n => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()));
};

async function gazetteCheck(coNames, num) {
  const searched = uniqueSearchNames(coNames);
  const found = new Map(), failed = [];
  for (const name of searched) {
    const results = parseJson(await getGazette(`/all-notices/notice/data.json?text=${encodeURIComponent(`"${name}"`)}&categorycode=${GAZETTE_CATEGORY}&sort-by=latest-date&results-page-size=20`));
    if (!results) { failed.push(name); continue; }
    for (const e of results.entry || []) {
      const id = String(e.id || '').split('/').pop();
      if (!id || found.has(id) || !e.published || monthsAgo(e.published) > GAZETTE_LOOKBACK_MONTHS) continue;
      // the text search also finds other companies' notices that merely mention this name
      if (e.title && !coNames.some(n => similar(n, e.title))) continue;
      found.set(id, { title: e.title || null, notice_code: e['f:notice-code'] || null, category: e.category?.['@term'] || null, published: e.published.slice(0, 10), url: `${GAZETTE_SITE}/notice/${id}`, id });
    }
  }
  const ownNumber = new RegExp(`(^|[^A-Z0-9])${num}([^A-Z0-9]|$)`, 'i');
  const notices = [], nameOnly = [];
  for (const [i, n] of [...found.values()].sort((a, b) => b.published.localeCompare(a.published)).entries()) {
    const full = i < MAX_GAZETTE_NOTICES ? await getGazette(`/notice/${n.id}/data.json?view=linked-data`) : null;
    const { id, ...notice } = n;
    (full !== null && ownNumber.test(full) ? notices : nameOnly).push(notice);
  }
  const flags = notices.map(n => n.notice_code === PETITION_CODE && monthsAgo(n.published) <= PETITION_WINDOW_MONTHS
    ? { severity: 'high', code: 'winding_up_petition', text: `Petition to wind up the company published in The Gazette on ${n.published}`, url: n.url }
    : { severity: 'medium', code: 'gazette_insolvency', text: `Gazette insolvency notice on ${n.published}: ${n.category || `notice type ${n.notice_code}`}`, url: n.url });
  return { searched_names: searched, failed_searches: failed, notices, name_only: nameOnly, flags };
}
const parseJson = text => { try { return JSON.parse(text); } catch { return null; } };

// RFC 4180: quoted fields may hold commas, doubled quotes and line breaks
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header = [], ...body] = rows;
  return body.filter(r => r.some(Boolean)).map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}
// organisation names compared without case, punctuation or legal suffix
const orgKey = s => (s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(/\b(the|limited|ltd|plc|llp)\b/g, ' ').replace(/\s+/g, ' ').trim();
const companyNumberKey = s => { const t = (s || '').trim().toUpperCase(); return /^\d{1,8}$/.test(t) ? t.padStart(8, '0') : t; };

const tokens = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));
const personKey = s => (s || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(t => t && !['mr', 'mrs', 'ms', 'miss', 'dr'].includes(t)).sort().join(' ');
const months = (a, b) => Math.abs(new Date(a) - new Date(b)) / (30.44 * 864e5);
const monthsAgo = d => months(d, Date.now());
const postcode = p => (p?.registered_office_address?.postal_code || '').replace(/\s/g, '').toUpperCase();
// current registered office plus every earlier one named in the filing history
function officePostcodes(p, filingItems) {
  const set = new Set(postcode(p) ? [postcode(p)] : []);
  for (const f of filingItems || []) {
    if (!(f.description || '').startsWith('change-registered-office-address')) continue;
    const text = `${f.description_values?.old_address || ''} ${f.description_values?.new_address || ''}`;
    for (const m of text.match(/\b[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}\b/gi) || []) set.add(m.replace(/\s/g, '').toUpperCase());
  }
  return set;
}
// length of the longest run of characters two strings share
function commonRun(a, b) {
  let best = 0, prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) if (a[i - 1] === b[j - 1]) { cur[j] = prev[j - 1] + 1; if (cur[j] > best) best = cur[j]; }
    prev = cur;
  }
  return best;
}
function similar(a, b) {
  const ta = tokens(a), tb = new Set(tokens(b));
  const shared = ta.filter(t => tb.has(t)).length;
  if (shared > 0 && shared / Math.min(ta.length, tb.size) >= 0.5) return true;
  // joined-up brand names share no whole word: "MyFooDesk" and "FooDeskHR" still share "foodesk"
  const ca = tokens(a).join(''), cb = tokens(b).join(''), run = commonRun(ca, cb);
  return run >= 6 && run / Math.min(ca.length, cb.length) >= 0.7;
}

const canonName = s => s.toLowerCase().replace(/\bltd\b/g, 'limited').replace(/[^a-z0-9]/g, '');
const bareName = s => canonName(s).replace(/(limited|plc|llp)$/, ''); // same name, give or take the legal suffix
const searchCompanies = async q => (await get(`/search/companies?q=${encodeURIComponent(q)}&items_per_page=5`))?.items || [];

async function resolve(q) {
  if (/^([A-Z]{2}\d{6}|\d{8})$/i.test(q.trim())) return q.trim().toUpperCase();
  const items = await searchCompanies(q);
  const exact = items.filter(i => canonName(i.title) === canonName(q));
  const loose = items.filter(i => bareName(i.title) === bareName(q));
  const pick = exact.length === 1 ? exact[0] : loose.length === 1 ? loose[0] : items.length === 1 ? items[0] : null;
  if (pick) return pick.company_number;
  console.log(JSON.stringify({ ambiguous: true, candidates: items.map(i => ({ number: i.company_number, name: i.title, status: i.company_status, incorporated: i.date_of_creation, address: i.address_snippet })) }, null, 2));
  process.exit(3);
}

const argv = process.argv.slice(2);
const akaAt = argv.indexOf('--aka');
const aka = akaAt >= 0 ? (argv[akaAt + 1] || '').split(',').map(s => s.trim()).filter(Boolean) : []; // brand, product or website names the company trades under
const arg = (akaAt >= 0 ? argv.slice(0, akaAt) : argv).join(' ');
if (!arg) fail(1, 'Usage: node ch-check.mjs "<company number or name>" [--aka "Brand, Product name"]');
if (!KEY) fail(2, 'COMPANIES_HOUSE_API_KEY not set');

const number = await resolve(arg);
const c = await get(`/company/${number}`);
if (!c) fail(1, `Company ${number} not found`);
const [off, psc, insolv, charges, filings] = await Promise.all([
  get(`/company/${number}/officers?items_per_page=100`),
  get(`/company/${number}/persons-with-significant-control?items_per_page=50`),
  get(`/company/${number}/insolvency`),
  get(`/company/${number}/charges`),
  get(`/company/${number}/filing-history?items_per_page=100`),
]);

const flags = [];
const flag = (severity, code, text, url = `${SITE}/company/${number}`) => flags.push({ severity, code, text, url });
const names = [c.company_name, ...(c.previous_company_names || []).map(p => p.name), ...aka];
const targetOffices = officePostcodes(c, filings?.items);
const ageMonths = c.date_of_creation ? monthsAgo(c.date_of_creation) : null;

// --- company-level flags
for (const f of registerFlags(c, number, insolv, filings?.items)) flag(f.severity, f.code, f.text, f.url);
if (c.accounts?.last_accounts?.type === 'dormant') flag('medium', 'dormant_accounts', 'Last accounts were filed as dormant');
if (ageMonths !== null && ageMonths < 24) flag('low', 'young_company', `Incorporated ${c.date_of_creation} (${Math.round(ageMonths)} months old)`);
const recentRenames = (c.previous_company_names || []).filter(p => p.ceased_on && monthsAgo(p.ceased_on) <= 36);
if (recentRenames.length >= 2) flag('medium', 'renames', `${recentRenames.length} name changes in the last 3 years: ${recentRenames.map(p => p.name).join(', ')}`);
const outstandingChargeItems = (charges?.items || []).filter(x => x.status === 'outstanding')
  .map(x => ({ created_on: x.created_on || null, lenders: (x.persons_entitled || []).map(p => p.name), type: x.classification?.description || null }))
  .sort((x, y) => (y.created_on || '').localeCompare(x.created_on || ''));
const outstandingCharges = outstandingChargeItems.length;
const chargesUrl = `${SITE}/company/${number}/charges`;
if (outstandingCharges) flag('info', 'charges', `${outstandingCharges} outstanding charge(s) (secured lending), latest ${outstandingChargeItems[0].created_on || 'undated'} to ${outstandingChargeItems[0].lenders.join(', ') || 'unnamed lender'}`, chargesUrl);
// fresh secured borrowing can mean a lender wanted security before extending more credit
const recentCharges = outstandingChargeItems.filter(x => x.created_on && monthsAgo(x.created_on) <= 12);
if (recentCharges.length) flag('low', 'recent_charge', `${recentCharges.length} new charge(s) in the last 12 months: ${recentCharges.map(x => `${x.created_on} to ${x.lenders.join(', ') || 'unnamed lender'}`).join(' and ')}`, chargesUrl);

// --- accounts: newest filing first; a newer filing's comparatives fill years whose own filing is PDF-only
const accountsFilings = (filings?.items || []).filter(f => f.category === 'accounts' && f.type === 'AA' && f.links?.document_metadata).slice(0, ACCOUNTS_FILINGS);
const accountsHistory = [], factsByPeriod = new Map();
let goingConcernDoubt = null;
for (const [i, f] of accountsFilings.entries()) {
  const doc = await accountsDocument(f.links.document_metadata);
  if (doc.text) {
    for (const [end, facts] of parseIxbrl(doc.text)) factsByPeriod.set(end, { ...facts, ...factsByPeriod.get(end) });
    if (i === 0) goingConcernDoubt = reportsGoingConcernDoubt(doc.text);
  }
  // The public site serves the PDF without a key, so path B and the agent's own tools can open it
  const pdf = doc.format === 'pdf' && f.transaction_id && {
    url: `${SITE}/company/${number}/filing-history/${f.transaction_id}/document?format=pdf&download=0`,
    pages: f.pages ?? null,
    scanned: Boolean(f.paper_filed),
  };
  accountsHistory.push({ year_end: f.description_values?.made_up_date || null, filed: f.date || null, format: doc.format, ...(pdf && { document: pdf }) });
}
for (const year of accountsHistory) {
  Object.assign(year, Object.fromEntries(Object.keys(ACCOUNT_CONCEPTS).map(k => [k, null])), factsByPeriod.get(year.year_end));
  // how long cash on hand would cover the wage bill, the closest public proxy for the risk of salaries going unpaid
  year.payroll_months_in_cash = year.cash !== null && year.staff_costs > 0 ? Math.round(year.cash / (year.staff_costs / 12) * 10) / 10 : null;
}
const [latestYear, previousYear] = accountsHistory;
const filingsUrl = `${SITE}/company/${number}/filing-history`;
if (goingConcernDoubt) flag('high', 'going_concern', `Accounts made up to ${latestYear.year_end} report a material uncertainty about going concern`, filingsUrl);
if (latestYear?.net_assets < 0) flag('medium', 'negative_net_assets', `Net liabilities of ${money(-latestYear.net_assets)} at ${latestYear.year_end}`, filingsUrl);
if (previousYear?.net_assets > 0 && latestYear.net_assets !== null && latestYear.net_assets >= 0 && latestYear.net_assets < previousYear.net_assets * 0.5) {
  flag('medium', 'net_assets_fall', `Net assets fell from ${money(previousYear.net_assets)} to ${money(latestYear.net_assets)} (${previousYear.year_end} to ${latestYear.year_end})`, filingsUrl);
}
// Staff employed by a company with little of its own is the setup that leaves them owed money if it fails
if (latestYear?.employees >= 10 && (latestYear.net_assets < 0 || latestYear.net_current_assets < 0)) {
  flag('low', 'employer_without_assets', `Employs ${latestYear.employees} people but its ${latestYear.net_assets < 0 ? 'debts exceed everything it owns' : 'short-term debts exceed its short-term assets'} at ${latestYear.year_end}: check which company owns the brand, contracts and other assets`, filingsUrl);
}
// Measured from the peak so cuts spread over several years still show
const headcountPeak = accountsHistory.slice(1).reduce((peak, year) => (year.employees ?? -1) > (peak?.employees ?? -1) ? year : peak, null);
if (headcountPeak?.employees >= MIN_HEADCOUNT_FOR_TREND && latestYear.employees !== null && latestYear.employees < headcountPeak.employees * 0.75) {
  flag('medium', 'headcount_fall', `Average employees fell from ${headcountPeak.employees} to ${latestYear.employees} (${headcountPeak.year_end} to ${latestYear.year_end})`, filingsUrl);
}

// --- Gazette
const gazette = await gazetteCheck(names, number);
const gazetteNames = gazette.searched_names;
for (const f of gazette.flags) flag(f.severity, f.code, f.text, f.url);

// --- corporate owners: an insolvent parent puts staff at the subsidiary at risk too, so follow owners
// up to the UK parent and run the register and Gazette checks on each (not the director checks)
const parents = [], parentsNotFollowed = [], seenInGroup = new Set([number]);
const parentQueue = [{ items: psc?.items, level: 1, ownerOf: c.company_name }];
while (parentQueue.length) {
  const { items, level, ownerOf } = parentQueue.shift();
  for (const owner of (items || []).filter(p => !p.ceased_on && (p.kind || '').startsWith('corporate-entity'))) {
    const ident = owner.identification || {}, register = ident.country_registered || ident.place_registered || ident.legal_authority;
    let parentNumber = companyNumberKey(ident.registration_number), matchedBy;
    const notFollowed = reason => parentsNotFollowed.push({ name: owner.name, owner_of: ownerOf, reason });
    if (!UK_REGISTER.test(register || '')) { notFollowed(register ? `registered in ${register}` : 'register not stated'); continue; }
    // UK owners are often recorded without a number. Live UK companies can't share a name, so an exact match is the owner.
    if (!parentNumber) {
      const matches = (await searchCompanies(owner.name)).filter(i => i.company_status !== 'dissolved' && bareName(i.title) === bareName(owner.name));
      if (matches.length !== 1) { notFollowed(`no company number given, and ${matches.length} companies match the name`); continue; }
      parentNumber = matches[0].company_number;
      matchedBy = 'name';
    }
    if (!/^([A-Z]{2}\d{6}|\d{8})$/.test(parentNumber)) { notFollowed('no UK company number given'); continue; }
    if (seenInGroup.has(parentNumber)) continue;
    if (level > MAX_PARENT_LEVELS) { notFollowed(`more than ${MAX_PARENT_LEVELS} levels up`); continue; }
    seenInGroup.add(parentNumber);
    const parent = await get(`/company/${parentNumber}`);
    if (!parent) { notFollowed(`no Companies House record for ${parentNumber}`); continue; }
    const [parentPsc, parentInsolvency, parentFilings] = await Promise.all([
      get(`/company/${parentNumber}/persons-with-significant-control?items_per_page=50`),
      get(`/company/${parentNumber}/insolvency`),
      get(`/company/${parentNumber}/filing-history?items_per_page=100`),
    ]);
    const parentGazette = await gazetteCheck([parent.company_name, ...(parent.previous_company_names || []).map(x => x.name)], parentNumber);
    const parentFlags = [...registerFlags(parent, parentNumber, parentInsolvency, parentFilings?.items), ...parentGazette.flags];
    for (const f of parentFlags) flag(f.severity, `parent_${f.code}`, `Parent ${parent.company_name}: ${f.text}`, f.url);
    parents.push({ level, name: parent.company_name, number: parentNumber, ...(matchedBy && { matched_by: matchedBy }), status: parent.company_status, owner_of: ownerOf, control: owner.natures_of_control || [],
      flags: parentFlags.map(f => f.code), gazette_name_only: parentGazette.name_only, url: `${SITE}/company/${parentNumber}` });
    parentQueue.push({ items: parentPsc?.items, level: level + 1, ownerOf: parent.company_name });
  }
}

// --- employer registers. Gender pay gap and sponsor licence are context for the report, never flags.
const nameKeys = new Set(names.map(orgKey).filter(Boolean));
const gpgYears = Array.from({ length: GPG_YEARS }, (_, i) => new Date().getFullYear() - i);
const sponsorPage = parseJson(await getPublic(`${GOVUK_BASE}/api/content${SPONSOR_REGISTER_PAGE}`));
const sponsorCsvUrl = (sponsorPage?.details?.attachments || []).find(a => a.content_type === 'text/csv')?.url;
const [sponsorCsv, ...gpgCsvs] = await Promise.all([
  sponsorCsvUrl ? getPublic(new URL(sponsorCsvUrl, GOVUK_BASE).href, 'text/csv') : null,
  ...gpgYears.map(y => getPublic(`${GPG_BASE}/viewing/download-data/${y}`, 'text/csv')),
]);

const genderPayGap = { filings: [], failed_years: [] };
for (const [i, csv] of gpgCsvs.entries()) {
  if (csv === null) { genderPayGap.failed_years.push(gpgYears[i]); continue; }
  for (const r of parseCsv(csv).filter(r => companyNumberKey(r.CompanyNumber) === number)) {
    genderPayGap.filings.push({ snapshot_year: gpgYears[i], employer_size: r.EmployerSize || null, submitted_late: r.SubmittedAfterTheDeadline === 'True',
      date_submitted: (r.DateSubmitted || '').slice(0, 10).replace(/\//g, '-') || null, url: `${GPG_SITE}/employers/${r.EmployerId}` });
  }
}

const sponsorRegister = { checked: sponsorCsv !== null, listed: null, matches: [], url: GOVUK_SITE + SPONSOR_REGISTER_PAGE };
if (sponsorCsv !== null) {
  const rows = parseCsv(sponsorCsv).filter(r => nameKeys.has(orgKey(r['Organisation Name'])))
    .map(r => ({ name: r['Organisation Name'], town: r['Town/City'] || null, type_rating: r['Type & Rating'] || null, route: r.Route || null }));
  sponsorRegister.matches = [...new Map(rows.map(r => [JSON.stringify(r), r])).values()];
  sponsorRegister.listed = sponsorRegister.matches.length > 0;
}

// Tribunal titles read "Claimant v Respondent(s): case number"; respondents may be numbered "(1) X (2) Y"
// Respondents carry a status, "(in Liquidation)", and may space a name differently from the register: "My Health Box" for "MYHEALTHBOX"
function namesRespondent(title, keys) {
  const respondents = (title || '').replace(/:[^:]*$/, '').split(/\s+v\.?\s+/i).slice(1).join(' v ')
    .replace(/\((in )?(creditors' voluntary |compulsory )?(liquidation|administration|receivership)\)/gi, ' ');
  const parties = [respondents, ...respondents.replace(/\(\d+\)/g, ',').split(/,|\s+and\s+|\s*&\s*/i)];
  const compact = s => orgKey(s).replace(/ /g, '');
  const wanted = new Set([...keys].map(k => k.replace(/ /g, '')));
  return parties.some(p => wanted.has(compact(p)));
}
async function searchTribunals(searchNames, keys, lookbackMonths = Infinity) {
  const decisions = new Map(), failed = [];
  const fields = ['title', 'link', 'public_timestamp', 'tribunal_decision_categories', 'tribunal_decision_decision_date'].map(f => `&fields=${f}`).join('');
  for (const name of searchNames) {
    const found = parseJson(await getPublic(`${GOVUK_BASE}/api/search.json?filter_format=employment_tribunal_decision&q=${encodeURIComponent(`"${name}"`)}&count=50${fields}`));
    if (!found) { failed.push(name); continue; }
    for (const d of found.results || []) {
      const decided = d.tribunal_decision_decision_date || d.public_timestamp?.slice(0, 10);
      if (!d.link || decisions.has(d.link) || !decided || monthsAgo(decided) > lookbackMonths || !namesRespondent(d.title, keys)) continue;
      decisions.set(d.link, { title: d.title, decision_date: decided, categories: d.tribunal_decision_categories || [], url: GOVUK_SITE + d.link });
    }
  }
  return { decisions: [...decisions.values()].sort((a, b) => b.decision_date.localeCompare(a.decision_date)), failed };
}
const targetTribunals = await searchTribunals(gazetteNames, nameKeys, TRIBUNAL_LOOKBACK_MONTHS);
const tribunals = targetTribunals.decisions, tribunalSearchFailed = targetTribunals.failed.length > 0;
if (tribunals.length) {
  flag('low', 'tribunal_decisions', `${tribunals.length} employment tribunal decision${tribunals.length > 1 ? 's' : ''} since ${tribunals.at(-1).decision_date} name the company as respondent; read them for the outcome`, tribunals[0].url);
}

// --- officers
const officers = off?.items || [];
const isDir = o => /director|llp-.*member/.test(o.officer_role || '');
const activeDirs = officers.filter(o => !o.resigned_on && isDir(o));
const recentResignations = officers.filter(o => o.resigned_on && isDir(o) && monthsAgo(o.resigned_on) <= 12);
if (recentResignations.length >= 2) flag('medium', 'director_churn', `${recentResignations.length} directors resigned in the last 12 months`, `${SITE}/company/${number}/officers`);
if (!activeDirs.length) flag('high', 'no_directors', 'No active directors on record', `${SITE}/company/${number}/officers`);

// A company in the target's own group closing (a subsidiary, or a sister under the same parent) is group housekeeping,
// not a company cycled out from under its staff
const groupOwnership = new Map();
async function inTargetGroup(num, depth = 0) {
  if (seenInGroup.has(num)) return true;
  if (depth >= MAX_PARENT_LEVELS || groupOwnership.has(num)) return groupOwnership.get(num) ?? false;
  const owners = (await get(`/company/${num}/persons-with-significant-control?items_per_page=50`))?.items || [];
  let owned = false;
  for (const owner of owners) {
    if (!owner.name || (owner.kind || '').startsWith('individual')) continue;
    // Subsidiaries often record their owner by name only, and that owner may be dissolved by now too
    const ownerNumber = companyNumberKey(owner.identification?.registration_number)
      || [(await searchCompanies(owner.name)).filter(i => bareName(i.title) === bareName(owner.name))].find(m => m.length === 1)?.[0].company_number;
    if (ownerNumber && await inTargetGroup(ownerNumber, depth + 1)) { owned = true; break; }
  }
  groupOwnership.set(num, owned);
  return owned;
}

const profiles = new Map();
let lookups = 0, skippedLookups = 0;
async function profile(num) {
  if (profiles.has(num)) return profiles.get(num);
  if (lookups >= MAX_PROFILE_LOOKUPS) { skippedLookups++; return null; }
  lookups++;
  const p = await get(`/company/${num}`);
  profiles.set(num, p);
  return p;
}

const histories = new Map();
async function addressHistory(num) {
  if (histories.has(num)) return histories.get(num);
  if (histories.size >= MAX_HISTORY_LOOKUPS) { skippedLookups++; return []; }
  const items = (await get(`/company/${num}/filing-history?category=address&items_per_page=100`))?.items || [];
  histories.set(num, items);
  return items;
}

// same person: same birth month and year and one name contained in the other (middle names come and go); without a birth date, the names must be equal
function samePerson(a, b) {
  const ka = personKey(a.name).split(' '), kb = personKey(b.name).split(' ');
  if (!a.date_of_birth || !b.date_of_birth) return ka.join(' ') === kb.join(' ');
  if (a.date_of_birth.year !== b.date_of_birth.year || a.date_of_birth.month !== b.date_of_birth.month) return false;
  const [short, long] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  return short.length >= 2 && short.every(t => long.includes(t));
}
// people to check: active directors, plus individual owners (PSCs) who are not directors
const people = activeDirs.slice(0, MAX_DIRECTORS).map(o => ({ name: o.name, officer_role: o.officer_role, appointed_on: o.appointed_on, date_of_birth: o.date_of_birth, paths: [o.links?.officer?.appointments].filter(Boolean) }));
for (const p of (psc?.items || []).filter(p => !p.ceased_on && (p.kind || '').startsWith('individual'))) {
  if (people.some(x => samePerson(x, p))) continue;
  people.push({ name: p.name, officer_role: 'owner (PSC), not a director', appointed_on: p.notified_on, date_of_birth: p.date_of_birth, paths: [] });
}
// the register often holds several officer records for one person, and owners have none linked: find them by name and birth month
for (const person of people) {
  if (!person.date_of_birth) continue; // a name alone is not enough to tie another record to this person
  const q = person.name.replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, '');
  const hits = (await get(`/search/officers?q=${encodeURIComponent(q)}&items_per_page=20`))?.items || [];
  for (const hit of hits) {
    if (hit.date_of_birth && hit.links?.self && samePerson(person, { name: hit.title, date_of_birth: hit.date_of_birth }) && !person.paths.includes(hit.links.self) && person.paths.length < 4) person.paths.push(hit.links.self);
  }
}

const directors = [], cyclesSeen = new Set();
for (const o of people) {
  const url = o.paths[0] ? SITE + o.paths[0] : `${SITE}/company/${number}/officers`;
  const items = [];
  for (const apptPath of o.paths) for (let start = 0; start < 100; start += 50) {
    const page = await get(`${apptPath}?items_per_page=50&start_index=${start}`);
    if (!page) break;
    items.push(...(page.items || []));
    if (start + 50 >= (page.total_results || 0)) break;
  }
  const seenCo = new Set(); // one entry per company, even if the officer holds two roles there
  const others = items.filter(a => a.appointed_to?.company_number && a.appointed_to.company_number !== number && !seenCo.has(a.appointed_to.company_number) && seenCo.add(a.appointed_to.company_number));
  const status = a => a.appointed_to.company_status || 'unknown';
  const dissolved = others.filter(a => status(a) === 'dissolved');
  const insolvent = others.filter(a => INSOLVENT.includes(status(a)));
  // look up insolvent companies first, then similar-named ones, then dissolved ones, then the rest (until the lookup budget runs out)
  const nameHit = a => names.some(n => similar(n, a.appointed_to.company_name));
  const queued = new Set();
  const queue = [...insolvent, ...others.filter(nameHit), ...dissolved, ...others].filter(a => !queued.has(a.appointed_to.company_number) && queued.add(a.appointed_to.company_number));

  const failed = [], related = [];
  let solventCount = 0;
  for (const a of queue) {
    const p = await profile(a.appointed_to.company_number);
    if (!p) continue;
    const signals = [];
    const insolvencyRecord = INSOLVENT.includes(p.company_status) || p.has_insolvency_history;
    const cases = insolvencyRecord ? (await get(`/company/${p.company_number}/insolvency`))?.cases : null;
    const solventLiquidation = insolvencyRecord && isSolventWindUp(cases);
    if (solventLiquidation && INSOLVENT.includes(a.appointed_to.company_status)) solventCount++;
    const wasInsolvent = insolvencyRecord && !solventLiquidation;
    const insolventFrom = wasInsolvent ? insolvencyStart(cases) : null;
    const failedOn = insolventFrom || p.date_of_cessation || null;
    // someone who left well before the failure didn't run the company into it, so it isn't theirs to answer for
    const leftBeforeFailure = Boolean(wasInsolvent && a.resigned_on && failedOn && a.resigned_on < failedOn && months(a.resigned_on, failedOn) > LEFT_BEFORE_FAILURE_MONTHS);
    const joinedAfterFailure = Boolean(wasInsolvent && a.appointed_on && failedOn && a.appointed_on > failedOn);
    const notTheirs = leftBeforeFailure || joinedAfterFailure;
    const closed = insolvencyRecord || p.company_status === 'dissolved';
    const pNames = [p.company_name, ...(p.previous_company_names || []).map(x => x.name)];
    const sameName = names.some(n => pNames.some(m => similar(n, m)));
    let samePostcode = postcode(p) && targetOffices.has(postcode(p)) ? 'same registered postcode' : null;
    if (!samePostcode && closed) { // a liquidator moves the registered office to their own address, so compare earlier offices too
      if ([...officePostcodes(p, await addressHistory(p.company_number))].some(x => targetOffices.has(x))) samePostcode = 'shared previous registered postcode';
    }
    if (wasInsolvent) signals.push('insolvency');
    if (sameName) signals.push('similar name');
    if (samePostcode) signals.push(samePostcode);
    if ((p.sic_codes || []).some(s => (c.sic_codes || []).includes(s))) signals.push('same SIC code');
    if (failedOn && c.date_of_creation && months(failedOn, c.date_of_creation) <= PHOENIX_WINDOW_MONTHS) signals.push(`target incorporated within ${PHOENIX_WINDOW_MONTHS} months of its ${insolventFrom ? 'insolvency' : 'closure'}`);
    else if (!failedOn && wasInsolvent && ageMonths !== null && ageMonths <= PHOENIX_WINDOW_MONTHS) signals.push('target incorporated recently while this company is insolvent');
    const phoenix = !wasInsolvent || notTheirs ? null : signals.includes('similar name') && signals.length >= 3 ? 'strong' : signals.length >= 2 ? 'possible' : null;
    if (sameName || samePostcode) related.push({ name: p.company_name, number: p.company_number, status: p.company_status, incorporated: p.date_of_creation || null, ceased: p.date_of_cessation || null, closed: !!closed, insolvent: !!wasInsolvent, failure_not_theirs: notTheirs, solvent_liquidation: solventLiquidation, group_member: Boolean(closed && !wasInsolvent && await inTargetGroup(p.company_number)), url: `${SITE}/company/${p.company_number}` });
    if (!closed) continue; // active companies only count towards the cycling check below
    if (!wasInsolvent && signals.length < 2) continue; // plain dissolved company, nothing to report
    failed.push({ name: p.company_name, number: p.company_number, status: p.company_status, insolvent_from: insolventFrom, ceased: p.date_of_cessation || null,
      director_resigned_on: a.resigned_on || null, director_left_before_failure: leftBeforeFailure, director_joined_after_failure: joinedAfterFailure, signals, phoenix, solvent_liquidation: solventLiquidation, url: `${SITE}/company/${p.company_number}` });
    if (phoenix) flag(phoenix === 'strong' ? 'high' : 'medium', `phoenix_${phoenix}`, `${o.name}: ${phoenix} phoenix pattern with ${p.company_name} (${p.company_status}) - ${signals.join(', ')}`, `${SITE}/company/${p.company_number}`);
  }
  const insolventOnly = failed.filter(f => f.signals.includes('insolvency') && !f.phoenix && !f.director_left_before_failure && !f.director_joined_after_failure);
  if (insolventOnly.length) flag('medium', 'director_insolvencies', `${o.name}: director of ${insolventOnly.length} other compan${insolventOnly.length > 1 ? 'ies' : 'y'} with insolvency history (${insolventOnly.map(f => f.name).join(', ')})`, url);
  // serial pattern: a chain of related companies (similar name or same registered postcode) opened and closed one after another
  related.sort((x, y) => (x.incorporated || '').localeCompare(y.incorporated || ''));
  const cycleCandidates = related.filter(r => !r.group_member), groupMembers = related.length - cycleCandidates.length;
  const closedRelated = cycleCandidates.filter(r => r.closed && (!r.ceased || monthsAgo(r.ceased) <= CYCLE_LOOKBACK_MONTHS));
  const cycleKey = closedRelated.map(r => r.number).sort().join(',');
  if (closedRelated.length >= 2 && !cyclesSeen.has(cycleKey)) {
    cyclesSeen.add(cycleKey);
    const span = r => `${(r.incorporated || '?').slice(0, 4)}-${r.ceased ? r.ceased.slice(0, 4) : r.insolvent ? (r.failure_not_theirs ? 'insolvent outside this director\'s tenure' : 'insolvent') : r.solvent_liquidation ? 'solvent liquidation' : r.closed ? 'closed' : 'active'}`;
    // a chain of solvent wind-ups is worth listing but never reaches high on its own
    const notSolvent = closedRelated.filter(r => !r.solvent_liquidation);
    flag(notSolvent.length >= 3 || closedRelated.some(r => r.insolvent && !r.failure_not_theirs) ? 'high' : 'medium', 'company_cycling', `${o.name}: ${closedRelated.length} closed companies in the last 10 years with a similar name or the same registered postcode${notSolvent.length < closedRelated.length ? `, ${closedRelated.length - notSolvent.length} of them in solvent liquidation` : ''} - ${cycleCandidates.map(r => `${r.name} (${span(r)})`).join(', ')}${groupMembers ? ` (${groupMembers} closed compan${groupMembers > 1 ? 'ies' : 'y'} in the target's own group left out)` : ''}`, url);
  }
  if (dissolved.length >= 5 && dissolved.length / others.length >= 0.5) flag('low', 'serial_dissolutions', `${o.name}: ${dissolved.length} of ${others.length} other appointments are dissolved companies`, url);

  let disqualification = null;
  if (!(o.officer_role || '').startsWith('corporate')) {
    const dq = await get(`/search/disqualified-officers?q=${encodeURIComponent(o.name)}&items_per_page=10`);
    for (const hit of (dq?.items || []).filter(i => personKey(i.title) === personKey(o.name))) {
      const dob = hit.date_of_birth && o.date_of_birth ? Number(hit.date_of_birth.slice(0, 4)) === o.date_of_birth.year && Number(hit.date_of_birth.slice(5, 7)) === o.date_of_birth.month : null;
      if (dob === false) continue;
      disqualification = dob ? 'name and birth month/year match' : 'name match only - verify';
      flag(dob ? 'high' : 'medium', 'disqualification', `${o.name}: disqualified-director register hit (${disqualification})`, `${SITE}/search/disqualified-officers?q=${encodeURIComponent(o.name)}`);
      break;
    }
  }
  directors.push({ name: o.name, role: o.officer_role, appointed_on: o.appointed_on || null, total_appointments: items.length, officer_records: o.paths.length, other_active: others.filter(a => status(a) === 'active' && !a.resigned_on).length, dissolved: dissolved.length, insolvent_now: insolvent.length - solventCount, solvent_liquidations: solventCount, failed_companies: failed, related_companies: related, disqualification, url });
}

// Staff left unpaid when a director's earlier company failed show up as tribunal claims against it, often years later
const linkedFailures = new Map();
for (const d of directors) {
  for (const f of d.failed_companies.filter(f => f.signals.includes('insolvency') && !f.director_left_before_failure)) {
    const linked = linkedFailures.get(f.number) || { name: f.name, number: f.number, insolventFrom: f.insolvent_from, directors: [], entries: [] };
    linked.directors.push(d.name);
    linked.entries.push(f);
    linkedFailures.set(f.number, linked);
  }
}
const phoenixRank = linked => linked.entries.some(f => f.phoenix === 'strong') ? 0 : linked.entries.some(f => f.phoenix) ? 1 : 2;
const failedToSearch = [...linkedFailures.values()].sort((a, b) => phoenixRank(a) - phoenixRank(b) || (b.insolventFrom || '').localeCompare(a.insolventFrom || ''));
const failedCompanyTribunals = { searched: [], failed_searches: [], not_searched: failedToSearch.slice(MAX_FAILED_COMPANY_TRIBUNAL_SEARCHES).map(l => l.name) };
for (const linked of failedToSearch.slice(0, MAX_FAILED_COMPANY_TRIBUNAL_SEARCHES)) {
  const coNames = [linked.name, ...((await profile(linked.number))?.previous_company_names || []).map(x => x.name)];
  const { decisions, failed } = await searchTribunals(uniqueSearchNames(coNames), new Set(coNames.map(orgKey)));
  if (failed.length) { failedCompanyTribunals.failed_searches.push(linked.name); continue; }
  failedCompanyTribunals.searched.push(linked.number);
  for (const f of linked.entries) f.tribunal_decisions = decisions;
  if (decisions.length) {
    flag('low', 'failed_company_tribunals', `${linked.name}, a failed company of ${linked.directors.join(' and ')}: ${decisions.length} employment tribunal decision${decisions.length > 1 ? 's name' : ' names'} it as respondent; read them for unpaid pay`, decisions[0].url);
  }
}

const pscs = (psc?.items || []).filter(p => !p.ceased_on).map(p => ({ name: p.name, kind: (p.kind || '').replace(/-person-with-significant-control$/, ''), control: p.natures_of_control || [] }));
if (!pscs.length) flag('info', 'no_psc', 'No active person with significant control on record', `${SITE}/company/${number}/persons-with-significant-control`);

const order = { high: 0, medium: 1, low: 2, info: 3 };
flags.sort((a, b) => order[a.severity] - order[b.severity]);
// whose record each flag comes from, so a reader can tell the employer's own findings from a parent's or a director's other companies
const DIRECTOR_RECORD = /^(phoenix_|company_cycling$|director_insolvencies$|serial_dissolutions$|failed_company_tribunals$|disqualification$)/;
for (const f of flags) f.record = f.code.startsWith('parent_') ? 'parent' : DIRECTOR_RECORD.test(f.code) ? 'director' : 'own';
console.log(JSON.stringify({
  checked_at: new Date().toISOString().slice(0, 10),
  company: {
    name: c.company_name, number, also_known_as: aka, status: c.company_status, type: c.type, incorporated: c.date_of_creation, age_months: ageMonths === null ? null : Math.round(ageMonths),
    registered_office: Object.values(c.registered_office_address || {}).join(', '), sic_codes: c.sic_codes || [],
    previous_names: (c.previous_company_names || []).map(p => ({ name: p.name, until: p.ceased_on })),
    accounts: { last_made_up_to: c.accounts?.last_accounts?.made_up_to || null, type: c.accounts?.last_accounts?.type || null, next_due: c.accounts?.next_due || null, overdue: !!c.accounts?.overdue,
      history: accountsHistory, going_concern_doubt: goingConcernDoubt },
    confirmation_statement: { next_due: c.confirmation_statement?.next_due || null, overdue: !!c.confirmation_statement?.overdue },
    outstanding_charges: outstandingCharges, charges: outstandingChargeItems, insolvency_cases: (insolv?.cases || []).map(x => x.type),
    gazette: { searched_names: gazette.searched_names, failed_searches: gazette.failed_searches, notices: gazette.notices },
    parents, gender_pay_gap: genderPayGap, sponsor_register: sponsorRegister,
    tribunal_decisions: { search_failed: tribunalSearchFailed, decisions: tribunals },
    active_directors: activeDirs.length, resigned_last_12_months: recentResignations.length, url: `${SITE}/company/${number}`,
  },
  directors, pscs, flags,
  meta: { requests, directors_not_checked: Math.max(0, activeDirs.length - MAX_DIRECTORS), people_without_officer_record: people.filter(p => !p.paths.length).map(p => p.name), company_lookups_skipped: skippedLookups, gazette_name_only: gazette.name_only, parents_not_followed: parentsNotFollowed, failed_company_tribunals: failedCompanyTribunals,
    caveats: ['Companies House often holds several officer records for one person, so appointment histories can be incomplete.', 'Name-based matches (similar names, disqualification hits) are leads to verify, not findings.',
      'Accounts figures are read from iXBRL tags only; a year marked "pdf" or "unavailable" has to be read by hand.',
      `Gazette notices from the last ${GAZETTE_LOOKBACK_MONTHS / 12} years are flagged only when they carry the company number; gazette_name_only lists the rest to check by hand.`,
      'The sponsor register and tribunal decisions are matched on name only. The sponsor register lists current sponsors only, so a revoked licence does not show.'] },
}, null, 2));
