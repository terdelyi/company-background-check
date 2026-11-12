// Builds the fictional sample reports shown in the README from the report template.
// node .github/make-samples.mjs skills/company-background-check/references/report-shell.html <out dir>
// then screenshot each page at 1000 by 1175px and 2x scale, so the two images match in size.
import fs from 'node:fs';
const template = fs.readFileSync(process.argv[2], 'utf8');
const out = process.argv[3];
const head = template.slice(0, template.indexOf('<main'));
// both sheets get the same height so the README screenshots line up
const samePage = '<style>.sheet { min-height: 1110px; }</style>';
const SITE = 'https://find-and-update.company-information.service.gov.uk';
const area = (status, name, line) => `<li class="area area--${status}"><h3>${name}</h3><span class="status">${{ concern: 'Concern', caution: 'Caution', clear: 'Clear', nodata: 'No data' }[status]}</span><p>${line}</p></li>`;
const flag = (sev, name, tag, text, source) => `<tr><td><span class="chip chip--${sev}">${sev[0].toUpperCase() + sev.slice(1)}</span></td><td><strong>${name}${tag ? ` <span class="tag">${tag}</span>` : ''}</strong> ${text}</td><td class="evidence"><a href="${SITE}">${source}</a></td></tr>`;

function page({ name, number, rating, qualifier, reason, context, areas, flags }) {
  const scale = ['Low', 'Medium', 'High'].map(l => `<li${l === rating ? ' aria-current="true"' : ''}>${l}</li>`).join('');
  return `${head}${samePage}<main class="sheet">
  <header>
    <p class="doc-type">Employer background check</p>
    <h1>${name}</h1>
    <dl class="meta">
      <div><dt>Company number</dt><dd>${number}</dd></div>
      <div><dt>Jurisdiction</dt><dd>England and Wales</dd></div>
      <div><dt>Checked on</dt><dd>12 Nov 2026</dd></div>
    </dl>
  </header>
  <section aria-label="Summary">
    <div class="verdict verdict--${rating.toLowerCase()}">
      <div class="verdict__rating">
        <p>Overall risk</p>
        <strong>${rating}</strong>
        ${qualifier ? `<p class="verdict__qualifier">${qualifier}</p>` : ''}
        <ol class="scale" aria-label="Risk scale">${scale}</ol>
      </div>
      <div class="verdict__reason"><p>${reason}</p><p class="small">${context}</p></div>
    </div>
    <ul class="areas">${areas.map(a => area(...a)).join('\n')}</ul>
    <p class="key">Concern: a high-severity finding. Caution: a medium one, or a gap that matters. Clear: checked, nothing adverse. No data: nothing to judge from.</p>
  </section>
  <section>
    <h2>Red flags</h2>
    ${flags.length ? `<div class="table-wrap"><table class="flags"><thead><tr><th>Severity</th><th>Flag</th><th class="evidence">Evidence</th></tr></thead><tbody>${flags.map(f => flag(...f)).join('\n')}</tbody></table></div>` : '<p>Nothing found.</p>'}
  </section>
</main></body></html>`;
}

fs.writeFileSync(`${out}/sample-high.html`, page({
  name: 'Wobblesworth Teapots Ltd', number: 'ZZ000101', rating: 'High',
  reason: 'The company entered administration in Oct 2026, and its director ran another company that became insolvent in 2025.',
  context: 'Administration means an administrator now runs the business, to rescue or sell it.',
  areas: [
    ['concern', 'Company record', 'In administration since 16 Oct 2026. Filings were up to date before that.'],
    ['concern', 'Directors and owners', 'Possible phoenix pattern with the director\'s other company, which shares a postcode.'],
    ['caution', 'Money', 'Owed £1.2m more than it owned at the end of Mar 2026, with 34 staff.'],
    ['clear', 'Redundancies', 'No rounds found in the last five years.'],
    ['concern', 'Legal and insolvency notices', 'Gazette notice of the administrators\' appointment.'],
    ['caution', 'Media coverage', 'Local press reports customers losing service.'],
    ['nodata', 'Employee reviews', 'No review pages found.'],
    ['clear', 'Coverage of this check', 'Full automated check, nothing left out.'],
  ],
  flags: [
    ['high', 'In administration', '', 'An administrator took control on 16 Oct 2026 to rescue or sell the business.', 'Companies House'],
    ['medium', 'Possible phoenix pattern', 'Director\'s other company', 'Wobblesworth Teapot Services Ltd went into liquidation in 2025 while Alex Example was a director. Same registered postcode.', 'Appointments'],
  ],
}));

fs.writeFileSync(`${out}/sample-low.html`, page({
  name: 'Sunny Badger Software Ltd', number: 'ZZ000102', rating: 'Low',
  reason: 'Nothing adverse on the public record: trading, filings on time, growing net assets and directors with no failed companies.',
  context: 'Positive net assets for six years, and cash covered 7 months of wages at the last year end.',
  areas: [
    ['clear', 'Company record', 'Trading since 2017, accounts and confirmation statement on time.'],
    ['clear', 'Directors and owners', 'Two directors who also own the company, both there since it was set up in 2017.'],
    ['clear', 'Money', 'Net assets of £2.4m, up from £1.9m, with 7 months of payroll in cash.'],
    ['clear', 'Redundancies', 'No rounds found, and headcount rose from 38 to 52.'],
    ['clear', 'Legal and insolvency notices', 'No Gazette notices. One tribunal claim, which was dismissed.'],
    ['clear', 'Media coverage', 'Mostly positive: a contract win and a Series A round.'],
    ['clear', 'Employee reviews', '4.2 on Glassdoor from 31 reviews.'],
    ['clear', 'Coverage of this check', 'Full automated check, nothing left out.'],
  ],
  flags: [
    ['low', 'Employment tribunal decision', '', 'One claim in 2023, which the tribunal dismissed.', 'Tribunal decisions'],
    ['info', 'Lender security', '', 'One outstanding charge to a high street bank, created in Mar 2024.', 'Charges'],
  ],
}));
