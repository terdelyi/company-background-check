import { accountsFiling, appointment, company, companyRoutes, director, individualPsc, ixbrl, ixbrlDocument, list } from './_helpers.mjs';
import { PAYMENT_PRACTICES_HEADER } from '../mock-server.mjs';

const target = company('ZZ000028', 'PLACEHOLDER QUARRY LTD', {
  accounts: { overdue: false, next_due: '2026-12-31', last_accounts: { made_up_to: '2025-12-31', type: 'full' } },
});
const chiDob = { month: 9, year: 1969 };

const paymentRow = (id, number, name, start, end, filed, days, within30, within60, after60, late) =>
  [id, start, end, filed, name, number, days, within30, within60, after60, late].join(',');
const PAYMENT_CSV = [
  PAYMENT_PRACTICES_HEADER,
  paymentRow('5001', 'ZZ000028', 'PLACEHOLDER QUARRY LTD', '2024-07-01', '2024-12-31', '2025-01-20', '48', '41', '35', '24', '30'),
  paymentRow('5002', 'ZZ000028', 'PLACEHOLDER QUARRY LTD', '2025-01-01', '2025-06-30', '2025-07-25', '64', '38', '30', '32', '45'),
  // a neighbour whose number contains the target's, and one whose quoted name holds a comma
  paymentRow('5003', 'ZZ0000280', 'PLACEHOLDER QUARRY HOLDINGS LTD', '2025-01-01', '2025-06-30', '2025-07-25', '20', '90', '8', '2', '5'),
  paymentRow('5004', 'ZZ900028', '"SAMPLE, ROCK LTD"', '2025-01-01', '2025-06-30', '2025-07-25', '30', '70', '20', '10', '15'),
].join('\n');

const entry = (title, slug, published, court) => `<entry><title>${title}</title><link href="https://caselaw.nationalarchives.gov.uk/${slug}" rel="alternate"/>`
  + `<published>${published}T00:00:00+00:00</published><author><name>${court}</name></author>`
  + `<tna:identifier slug="${slug}" type="ukncn">[${published.slice(0, 4)}] EWHC ${slug.split('/').at(-1)} (Comm)</tna:identifier></entry>`;
const CASELAW_FEED = '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:tna="https://caselaw.nationalarchives.gov.uk">'
  + entry('Placeholder Quarry Ltd v Example Haulage &amp; Plant Ltd', 'ewhc/comm/2025/101', '2025-09-15', 'High Court (Commercial Court)')
  + entry('Example Bank Plc v Sample Person', 'ewhc/ch/2025/202', '2025-05-01', 'High Court (Chancery Division)')
  + entry('Sample Council v Placeholder Quarry Ltd', 'ewhc/qb/2018/303', '2018-03-01', 'High Court (Queen\'s Bench Division)')
  + '</feed>';

export default {
  description: 'Payment practice reports are found by company number newest first, court judgments count only when the title names the company as a party within six years, and a company over two IR35 limits is not small',
  args: ['ZZ000028'],
  expect: {
    exit: 0,
    flags: ['low court_judgments'],
    fields: {
      'company.payment_practices.reports': 2,
      'company.payment_practices.latest': {
        period_start: '2025-01-01', period_end: '2025-06-30', filed: '2025-07-25', average_days_to_pay: 64, paid_within_30_days_pct: 38,
        paid_31_to_60_days_pct: 30, paid_after_60_days_pct: 32, not_paid_within_terms_pct: 45, url: 'https://check-payment-practices.service.gov.uk/report/5002/',
      },
      'company.payment_practices.previous.average_days_to_pay': 48,
      'company.court_judgments.judgments.length': 1,
      'company.court_judgments.judgments.0': {
        title: 'Placeholder Quarry Ltd v Example Haulage & Plant Ltd', date: '2025-09-15', court: 'High Court (Commercial Court)',
        citation: '[2025] EWHC 101 (Comm)', url: 'https://caselaw.nationalarchives.gov.uk/ewhc/comm/2025/101',
      },
      'flags.0.text': '1 court judgment since 2025-09-15 name the company as a party, read them for what was decided',
      'company.ir35_size': {
        status: 'not small', basis: 'figures in the latest accounts', year_end: '2025-12-31',
        figures: { turnover: 20000000, balance_sheet_total: 9000000, employees: 80 }, limits: { turnover: 15000000, balance_sheet_total: 7500000, employees: 50 }, part_of_group: false,
      },
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Chi', 'OFF-CHI28', chiDob)],
      pscs: [individualPsc('Mr Chi Example', chiDob)],
      filings: [accountsFiling('DOC-ZZ28-2025', '2025-12-31', '2026-03-01')],
    }),
    '/officers/OFF-CHI28/appointments': list(appointment('ZZ000028', 'PLACEHOLDER QUARRY LTD')),
    ...ixbrlDocument('DOC-ZZ28-2025', ixbrl([
      { end: '2025-12-31', facts: { NetAssetsLiabilities: '4,000,000', TurnoverRevenue: '20,000,000', FixedAssets: '3,000,000', CurrentAssets: '6,000,000', AverageNumberEmployeesDuringPeriod: '80' } },
    ])),
    '/export/csv/': { csv: PAYMENT_CSV },
    '/atom.xml?query="PLACEHOLDER QUARRY"': { xml: CASELAW_FEED },
  },
};
