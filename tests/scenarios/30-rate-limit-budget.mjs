import { accountsFiling, company, companyRoutes, director, ixbrl, ixbrlDocument } from './_helpers.mjs';

const target = company('ZZ000030', 'PLACEHOLDER KETTLE WORKS LTD', { date_of_creation: '2015-01-01' });
const latest = ixbrlDocument('DOC-ZZ30-2025', ixbrl([{ end: '2025-03-31', facts: { NetAssetsLiabilities: '80,000' } }]));
const previous = ixbrlDocument('DOC-ZZ30-2024', ixbrl([{ end: '2024-03-31', facts: { NetAssetsLiabilities: '70,000' } }]));

export default {
  description: 'Waits for the Companies House rate limit are capped for the whole run, so once the allowance is spent a rate-limited document is skipped instead of waited for',
  args: ['ZZ000030'],
  env: { CH_MAX_RATE_LIMIT_WAITS: '1' },
  expect: {
    exit: 0,
    fields: {
      'company.accounts.history.0.format': 'ixbrl',
      'company.accounts.history.0.net_assets': 80000,
      'company.accounts.history.1.format': 'unavailable',
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Rho', 'OFF-RHO30', { month: 5, year: 1980 })],
      filings: [accountsFiling('DOC-ZZ30-2025', '2025-03-31', '2025-10-01'), accountsFiling('DOC-ZZ30-2024', '2024-03-31', '2024-10-01')],
    }),
    ...latest,
    ...previous,
    '/document/DOC-ZZ30-2025': { failFirst: 1, failStatus: 429, then: latest['/document/DOC-ZZ30-2025'] },
    '/document/DOC-ZZ30-2024': { failFirst: 1, failStatus: 429, then: previous['/document/DOC-ZZ30-2024'] },
  },
};
