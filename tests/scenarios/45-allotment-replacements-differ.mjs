import { company, companyRoutes, list } from './_helpers.mjs';

const number = 'ZZ000045';
const target = company(number, 'PLACEHOLDER OPCO LTD');
const pdf = id => `https://find-and-update.company-information.service.gov.uk/company/${number}/filing-history/${id}/document?format=pdf&download=0`;
const allotment = (transaction_id, filed, allotted, capital, extra = {}) => ({
  type: 'SH01', transaction_id, date: filed, category: 'capital', description: 'capital-allotment-shares',
  description_values: { date: allotted, capital: [{ currency: 'GBP', figure: capital }] }, ...extra,
});

export default {
  description: 'A replacement that adds less share capital than the form it replaces is reported as not adding up',
  args: [number],
  expect: { exit: 0, fields: {
    'company.share_allotments.1.replaced_by': [pdf('SH01-45-FIX')],
    'company.share_allotments.1.replacements_add_up': false,
  } },
  routes: companyRoutes(target, {
    filings: [
      allotment('SH01-45-FIX', '2026-03-01', '2026-01-10', '12'),
      allotment('SH01-45-OLD', '2026-01-12', '2026-01-10', '15', {
        annotations: [{ description: 'annotation', annotation: 'Replaced a replacement SH01 was registered 01/03/2026 as the original contained an error' }],
      }),
      allotment('SH01-45-EARLIER', '2025-02-01', '2025-01-15', '10'),
    ],
    charges: list(),
  }),
};
