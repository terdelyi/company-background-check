import { accountsFiling, appointment, company, companyRoutes, director, individualPsc, ixbrl, ixbrlDocument, list } from './_helpers.mjs';

const target = company('ZZ000012', 'PLACEHOLDER SHRINKING LTD');
const upsilonDob = { month: 9, year: 1969 };
const goingConcernNote = 'These conditions indicate the existence of a material uncertainty which may cast significant doubt on the company\'s ability to continue as a going concern.';

export default {
  description: 'A going-concern material uncertainty, net liabilities and a 40% drop in staff each raise a flag; a negative balance is not also counted as a fall',
  args: ['ZZ000012'],
  expect: {
    exit: 0,
    flags: ['high going_concern', 'medium negative_net_assets', 'medium headcount_fall'],
    fields: {
      'company.accounts.history.0.net_assets': -85400,
      'company.accounts.going_concern_doubt': true,
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Upsilon', 'OFF-UPSILON', upsilonDob)],
      pscs: [individualPsc('Mr Upsilon Example', upsilonDob)],
      filings: [
        accountsFiling('DOC-ZZ12-2025', '2025-12-31', '2026-05-20'),
        accountsFiling('DOC-ZZ12-2024', '2024-12-31', '2025-06-02'),
      ],
    }),
    '/officers/OFF-UPSILON/appointments': list(appointment('ZZ000012', 'PLACEHOLDER SHRINKING LTD')),
    ...ixbrlDocument('DOC-ZZ12-2025', ixbrl([
      { end: '2025-12-31', facts: { NetAssetsLiabilities: { v: '85,400', sign: '-' }, AverageNumberEmployeesDuringPeriod: '18' } },
    ], goingConcernNote)),
    ...ixbrlDocument('DOC-ZZ12-2024', ixbrl([
      { end: '2024-12-31', facts: { NetAssetsLiabilities: '120,000', AverageNumberEmployeesDuringPeriod: '30' } },
    ])),
  },
};
