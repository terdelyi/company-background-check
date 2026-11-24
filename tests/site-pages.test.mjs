import assert from 'node:assert/strict';
import { test } from 'node:test';
import { claimSentences, listSitePages } from '../skills/company-background-check/scripts/site-pages.mjs';

const base = 'https://placeholder-opco.example/';

test('lists own pages from home page links and the sitemap, once each', () => {
  const homeHtml = `
    <a href="/about">About</a> <a href="/services/law-firms">Law firms</a>
    <a href="https://www.placeholder-opco.example/about/">About again</a>
    <a href="https://app.placeholder-opco.example/sign-up">Sign up</a>
    <a href="https://elsewhere.example/news">Press</a> <a href="#team">Team</a>`;
  const sitemapXmls = ['<urlset><url><loc>https://placeholder-opco.example/case-studies/pilot</loc></url><url><loc>https://placeholder-opco.example/sitemap-2.xml</loc></url></urlset>'];
  assert.deepEqual(listSitePages({ base, homeHtml, sitemapXmls }).pages, [
    { url: 'https://placeholder-opco.example', source: 'home' },
    { url: 'https://placeholder-opco.example/about', source: 'home page link' },
    { url: 'https://placeholder-opco.example/services/law-firms', source: 'home page link' },
    { url: 'https://placeholder-opco.example/case-studies/pilot', source: 'sitemap' },
  ]);
});

test('leaves out legal pages, assets and query strings', () => {
  const homeHtml = '<a href="/privacy-policy">Privacy</a><a href="/terms">Terms</a><a href="/cookies">Cookies</a><a href="/logo.png">Logo</a><a href="/pricing?plan=pro">Pricing</a>';
  assert.deepEqual(listSitePages({ base, homeHtml }).pages.map(p => p.url), [
    'https://placeholder-opco.example', 'https://placeholder-opco.example/pricing',
  ]);
});

test('caps the list and says so', () => {
  const homeHtml = Array.from({ length: 60 }, (_, i) => `<a href="/page-${i}">Page</a>`).join('');
  const result = listSitePages({ base, homeHtml });
  assert.equal(result.pages.length, 40);
  assert.equal(result.truncated, true);
});

test('picks out sentences that make customer, partner, funding or testimonial claims', () => {
  const html = `<html><head><style>.a{}</style><script>var trusted = "by everyone";</script></head><body>
    <nav><a href="/">Home</a></nav>
    <h1>Protect your work</h1>
    <p>Etching takes seconds. Trusted by a leading international law firm, now in a live pilot.</p>
    <p>We are backed by angel investors &amp; industry experts.</p>
    <blockquote>&ldquo;This tool has been invaluable for my studio.&rdquo; Placeholder Person, Studio Founder</blockquote>
    <p>Our blog covers copyright basics.</p></body></html>`;
  assert.deepEqual(claimSentences(html), [
    'Trusted by a leading international law firm, now in a live pilot.',
    'We are backed by angel investors & industry experts.',
    '“This tool has been invaluable for my studio.” Placeholder Person, Studio Founder',
  ]);
});

test('catches case study labels, attributions and validations, and skips generic mentions of clients', () => {
  const html = `<p>A proactive service clients can use from day one.</p>
    <p>Case study · International IP practice</p>
    <p>— IP lawyer, international law firm</p>
    <p>Use case validated by</p><p>Placeholder Person, Barrister.</p>`;
  assert.deepEqual(claimSentences(html), [
    'Case study · International IP practice',
    '— IP lawyer, international law firm',
    'Use case validated by Placeholder Person, Barrister.',
  ]);
});

test('skips pull quotes in articles but keeps their claim sentences', () => {
  const html = '<blockquote>“The question is whether you can prove the role the human played.”</blockquote><p>The company was backed by two funds.</p>';
  assert.deepEqual(claimSentences(html, { article: true }), ['The company was backed by two funds.']);
});
