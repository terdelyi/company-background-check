#!/usr/bin/env node
// Lists a company website's own pages from its sitemap and home page links, so every page that might
// carry a customer, partner or funding claim gets read. Usage: node site-pages.mjs <website url>
import { pathToFileURL } from 'node:url';

const USER_AGENT = 'company-background-check/1.0.0 (+https://github.com/terdelyi/company-background-check)';
const MAX_PAGES = 40;
const SKIPPED_PATH = /(?:^|\/)(?:privacy|cookies?|terms|legal|gdpr|accessibility|sitemap|login|log-in|sign-?in|sign-?up|register|cart|checkout|wp-admin|feed|cdn-cgi)(?:[/.-]|$)/i;
const ASSET = /\.(?:css|js|mjs|json|xml|txt|ico|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|eot|mp4|webm|mp3|pdf|zip)$/i;

const MAX_CLAIMS_PER_PAGE = 10;
const CLAIM = /\b(?:case stud(?:y|ies)|pilots?|trusted by|used by|chosen by|loved by|working with|partnered with|in partnership with|(?:our|key) (?:customers|clients|partners|investors)|(?:customers|clients|partners|investors) include|backed by|funded by|investment from|raised [£$€]|validated by|endorsed by|approved by|recognised by|recognized by|award(?:s|ed)?|winner of|certified|accredited|regulated by|authori[sz]ed by)\b/i;
const QUOTE = /[“"][^”"]{20,}[”"]/;
const ATTRIBUTION = /^[—–-]\s*\S.{2,120}$/;
const ARTICLE_PATH = /\/(?:blog|news|resources|insights|articles?|posts?)\//i;
const ENTITIES = { amp: '&', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', ndash: '–', mdash: '—', hellip: '…' };

const sameSite = (a, b) => a.replace(/^www\./, '') === b.replace(/^www\./, '');

// Sentences a reader would take as a claim about customers, partners, funding or regulation, plus testimonials
// and who they are attributed to. Articles quote people for effect, so their pull quotes are not testimonials.
export function claimSentences(html, { article = false } = {}) {
  const text = html
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(?:p|div|li|ul|ol|blockquote|h[1-6]|section|article|header|footer|nav|figure|figcaption|td|th|tr|br)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m);
  const found = [];
  const blocks = text.split('\n').map(b => b.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .reduce((joined, b) => (/\bby$/i.test(joined.at(-1) || '') ? joined.push(`${joined.pop()} ${b}`) : joined.push(b), joined), []);
  for (const block of blocks) {
    const isTestimonial = !article && (QUOTE.test(block) || ATTRIBUTION.test(block));
    const candidates = isTestimonial ? [block] : block.split(/(?<=[.!?])\s+/).filter(s => CLAIM.test(s));
    for (const sentence of candidates) {
      const clipped = sentence.length > 300 ? `${sentence.slice(0, 297)}...` : sentence;
      if (!found.includes(clipped)) found.push(clipped);
    }
  }
  return found.slice(0, MAX_CLAIMS_PER_PAGE);
}

export function listSitePages({ base, homeHtml = '', sitemapXmls = [] }) {
  const root = new URL(base);
  const pages = new Map();
  const add = (href, source) => {
    let url;
    try { url = new URL(href.replace(/&amp;/g, '&'), root); } catch { return; }
    if (!/^https?:$/.test(url.protocol) || !sameSite(url.hostname, root.hostname)) return;
    if (ASSET.test(url.pathname) || SKIPPED_PATH.test(url.pathname)) return;
    url.hash = ''; url.search = ''; url.hostname = root.hostname;
    const key = url.href.replace(/\/$/, '');
    if (!pages.has(key)) pages.set(key, source);
  };
  add(root.href, 'home');
  for (const m of homeHtml.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#][^"']*)["']/gi)) add(m[1], 'home page link');
  for (const xml of sitemapXmls) {
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) if (!/\.xml$/i.test(m[1])) add(m[1], 'sitemap');
  }
  const all = [...pages].map(([url, source]) => ({ url, source }));
  return { pages: all.slice(0, MAX_PAGES), truncated: all.length > MAX_PAGES };
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    return res.ok ? await res.text() : null;
  } catch { return null; }
}

async function main() {
  const input = process.argv[2];
  if (!input) { console.error('Usage: node site-pages.mjs <website url>'); process.exit(2); }
  const base = new URL(/^https?:\/\//.test(input) ? input : `https://${input}`).origin + '/';
  const failed = [];
  const homeHtml = await fetchText(base);
  if (homeHtml === null) failed.push(base);
  const robots = await fetchText(new URL('/robots.txt', base).href) || '';
  const sitemapUrls = [...new Set([...robots.matchAll(/^sitemap:\s*(\S+)/gim)].map(m => m[1]).concat(new URL('/sitemap.xml', base).href))];
  const sitemapXmls = [];
  for (const url of sitemapUrls.slice(0, 3)) {
    const xml = await fetchText(url);
    if (xml === null) continue;
    sitemapXmls.push(xml);
    // A sitemap index points to further sitemaps; follow a few of them.
    for (const m of [...xml.matchAll(/<sitemap>\s*<loc>\s*([^<\s]+)/gi)].slice(0, 3)) {
      const child = await fetchText(m[1]);
      if (child !== null) sitemapXmls.push(child);
    }
  }
  const result = listSitePages({ base, homeHtml: homeHtml || '', sitemapXmls });
  for (const page of result.pages) {
    const html = page.source === 'home' ? homeHtml : await fetchText(page.url);
    if (html === null) { failed.push(page.url); page.claims = null; continue; }
    page.claims = claimSentences(html, { article: ARTICLE_PATH.test(new URL(page.url).pathname) });
  }
  console.log(JSON.stringify({ site: base, ...result, sitemap_found: sitemapXmls.length > 0, failed }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
