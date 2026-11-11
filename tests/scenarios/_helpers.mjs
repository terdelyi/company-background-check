// Builders for fictional Companies House records. Every company number uses the ZZ prefix,
// which Companies House never issues, so no fixture can describe a real company.

export const office = postcode => ({ address_line_1: '1 Example Street', locality: 'Testtown', postal_code: postcode });

export const company = (number, name, extra = {}) => ({
  company_number: number,
  company_name: name,
  company_status: 'active',
  type: 'ltd',
  date_of_creation: '2015-03-01',
  registered_office_address: office('ZZ1 1AA'),
  sic_codes: ['62012'],
  accounts: { overdue: false, next_due: '2026-12-31', last_accounts: { made_up_to: '2025-03-31', type: 'micro-entity' } },
  confirmation_statement: { overdue: false, next_due: '2026-09-01' },
  ...extra,
});

export const director = (name, id, dob, extra = {}) => ({
  name,
  officer_role: 'director',
  appointed_on: '2015-03-01',
  date_of_birth: dob,
  links: { officer: { appointments: `/officers/${id}/appointments` } },
  ...extra,
});

export const individualPsc = (name, dob) => ({
  name,
  kind: 'individual-person-with-significant-control',
  date_of_birth: dob,
  natures_of_control: ['ownership-of-shares-75-to-100-percent'],
  notified_on: '2016-04-06',
});

export const corporatePsc = (name, registrationNumber, country, extra = {}) => ({
  name,
  kind: 'corporate-entity-person-with-significant-control',
  identification: { registration_number: registrationNumber, country_registered: country, legal_form: 'Limited company' },
  natures_of_control: ['ownership-of-shares-75-to-100-percent'],
  notified_on: '2016-04-06',
  ...extra,
});

export const appointment =(number, name, status = 'active', extra = {}) => ({
  appointed_to: { company_number: number, company_name: name, company_status: status },
  appointed_on: '2015-03-01',
  ...extra,
});

export const list = (...items) => ({ items, total_results: items.length });

export const accountsFiling = (docId, madeUpDate, filed, extra = {}) => ({
  transaction_id: `TX-${docId}`,
  category: 'accounts',
  type: 'AA',
  date: filed,
  description: 'accounts-with-accounts-type-small',
  description_values: { made_up_date: madeUpDate },
  links: { document_metadata: `https://frontend-doc-api.company-information.service.gov.uk/document/${docId}` },
  ...extra,
});

// Document API routes: an iXBRL document is served through a redirect, as the real API does
export const ixbrlDocument = (docId, xhtml) => ({
  [`/document/${docId}`]: { resources: { 'application/pdf': {}, 'application/xhtml+xml': {} } },
  [`/document/${docId}/content`]: { redirect: `/storage/${docId}` },
  [`/storage/${docId}`]: { storage: xhtml },
});
export const pdfDocument = docId => ({ [`/document/${docId}`]: { resources: { 'application/pdf': {} } } });

const fact = (name, context, value) => {
  const { v, scale, sign, format = 'ixt2:numdotdecimal' } = typeof value === 'object' ? value : { v: value };
  const extra = `${scale ? ` scale="${scale}"` : ''}${sign ? ` sign="${sign}"` : ''}`;
  return `<ix:nonFraction name="core:${name}" contextRef="${context}" unitRef="GBP" decimals="0" format="${format}"${extra}>${v}</ix:nonFraction>`;
};

// periods: [{ end, facts: { ConceptName: '1,234' | { v, scale, sign, format } } }], newest first
export const ixbrl = (periods, text = '') => {
  const contexts = periods.map(p => `<xbrli:context id="ctx-${p.end}"><xbrli:entity><xbrli:identifier scheme="http://www.companieshouse.gov.uk/">ZZ</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:instant>${p.end}</xbrli:instant></xbrli:period></xbrli:context>`
    // a dimensional context whose figures must not be read as company totals
    + `<xbrli:context id="seg-${p.end}"><xbrli:entity><xbrli:identifier scheme="http://www.companieshouse.gov.uk/">ZZ</xbrli:identifier><xbrli:segment><xbrldi:explicitMember dimension="core:Segment">core:Other</xbrldi:explicitMember></xbrli:segment></xbrli:entity><xbrli:period><xbrli:instant>${p.end}</xbrli:instant></xbrli:period></xbrli:context>`).join('');
  const facts = periods.flatMap(p => [
    fact('NetAssetsLiabilities', `seg-${p.end}`, '999,999,999'),
    ...Object.entries(p.facts).map(([name, value]) => fact(name, `ctx-${p.end}`, value)),
  ]).join(' ');
  return `<html xmlns="http://www.w3.org/1999/xhtml"><body><div style="display:none"><ix:header><ix:resources>${contexts}</ix:resources></ix:header></div><p>${facts}</p><p>${text}</p></body></html>`;
};

// Gazette search results and full notices, shaped like the real JSON feeds
export const gazetteSearch = (name, notices) => ({
  [`/all-notices/notice/data.json?text="${name}"`]: {
    'f:total': String(notices.length),
    entry: notices.map(n => ({
      id: `https://www.thegazette.co.uk/id/notice/${n.id}`,
      'f:notice-code': n.code,
      title: n.title,
      published: `${n.published}T09:00:00`,
      category: { '@term': n.category },
      content: `<div><p>In the matter of ${n.title} …</p></div>`,
    })),
  },
  ...Object.fromEntries(notices.filter(n => n.number).map(n => [
    `/notice/${n.id}/data.json`,
    { format: 'linked-data-api', result: { primaryTopic: { hasNoticeCode: n.code, isAbout: { type: ['LimitedCompany'], name: n.title, companyNumber: n.number } } } },
  ])),
});

export const CLEAN_AUDIT = 'Based on the work we have performed, we have not identified any material uncertainties relating to events or conditions that may cast significant doubt on the company\'s ability to continue as a going concern.';

export const companyRoutes = (c, { officers = [], pscs = [], filings = [], insolvency, charges } = {}) => ({
  [`/company/${c.company_number}`]: c,
  [`/company/${c.company_number}/officers`]: list(...officers),
  [`/company/${c.company_number}/persons-with-significant-control`]: list(...pscs),
  [`/company/${c.company_number}/filing-history`]: list(...filings),
  ...(insolvency && { [`/company/${c.company_number}/insolvency`]: insolvency }),
  ...(charges && { [`/company/${c.company_number}/charges`]: charges }),
});

export const tribunalDecision = (title, date, categories) => ({
  title, link: `/employment-tribunal-decisions/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, public_timestamp: `${date}T10:00:00Z`,
  tribunal_decision_categories: categories, tribunal_decision_decision_date: date,
});
