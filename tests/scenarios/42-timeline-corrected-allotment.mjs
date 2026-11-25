import { company, companyRoutes, list } from './_helpers.mjs';

const number = 'ZZ000042';
const target = company(number, 'PLACEHOLDER OPCO LTD');
const history = `https://find-and-update.company-information.service.gov.uk/company/${number}/filing-history`;
const pdf = id => `${history}/${id}/document?format=pdf&download=0`;
const allotment = (transaction_id, date, extra = {}) => ({
  type: 'SH01', transaction_id, date, category: 'capital', description: 'capital-allotment-shares',
  description_values: { date: '2026-01-19', capital: [{ currency: 'GBP', figure: '14.6912' }] }, ...extra,
});

export default {
  description: 'A replaced share allotment and its replacements are named with links in the timeline limits, every allotment form is listed to read, and the replacements are checked to add up to the replaced form',
  args: [number],
  expect: { exit: 0, fields: {
    'company.share_allotments': [
      { form: 'SH01', allotted_on: '2025-01-06', filed_on: '2025-04-24', replaced: false, form_url: pdf('SH01-42-EARLIER'), nominal_capital_after: 10.16, nominal_increase: null },
      { form: 'SH01', allotted_on: '2026-01-19', filed_on: '2026-01-19', replaced: true, form_url: pdf('SH01-42-OLD'), nominal_capital_after: 14.6912, nominal_increase: null, replaced_by: [pdf('SH01-42'), pdf('SH01-42-FIX')], replacements_add_up: true },
      { form: 'SH01', allotted_on: '2026-01-19', filed_on: '2026-05-10', replaced: false, form_url: pdf('SH01-42'), nominal_capital_after: 14.6912, nominal_increase: 3.8312 },
      { form: 'RP01SH01', allotted_on: '2026-01-18', filed_on: '2026-05-17', replaced: false, form_url: pdf('SH01-42-FIX'), nominal_capital_after: 10.86, nominal_increase: 0.7 },
    ],
    'company.timeline.events.length': 1,
    'company.timeline.events.0.kind': 'share_allotment',
    'company.timeline.events.0.filed_date': '2026-05-10',
    'company.timeline.limits': [
      `SH01 filed 2026-01-19 has a removal or rectification annotation and is not counted. Check it before relying on it: ${pdf('SH01-42-OLD')}`,
      `RP01SH01 filed 2026-05-17 replaces or corrects an earlier filing and is not counted as a new event. Read it for the corrected details: ${pdf('SH01-42-FIX')}`,
    ],
  } },
  routes: companyRoutes(target, {
    filings: [
      {
        type: 'RP01SH01', transaction_id: 'SH01-42-FIX', date: '2026-05-17', category: 'capital', description: 'legacy',
        description_values: { description: 'Replacement filing of SH01 - 18/01/26 Statement of Capital gbp 10.86' },
      },
      allotment('SH01-42', '2026-05-10'),
      allotment('SH01-42-OLD', '2026-01-19', {
        annotations: [{ description: 'annotation', annotation: 'Replaced a replacement SH01 was registered 17/05/2026 as the original contained an error' }],
      }),
      allotment('SH01-42-EARLIER', '2025-04-24', { description_values: { date: '2025-01-06', capital: [{ currency: 'GBP', figure: '10.16' }] } }),
    ],
    charges: list(),
  }),
};
