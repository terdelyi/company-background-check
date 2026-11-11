import { CLEAN_AUDIT, accountsFiling, appointment, company, companyRoutes, director, individualPsc, ixbrl, ixbrlDocument, list } from './_helpers.mjs';

const target = company('ZZ000011', 'PLACEHOLDER STEADY LTD');
const tauDob = { month: 6, year: 1974 };

export default {
  description: 'Three iXBRL accounts are read with scale and number formats, newer comparatives win, and a clean audit report is not a going-concern doubt',
  args: ['ZZ000011'],
  expect: {
    exit: 0,
    flags: [],
    fields: {
      'company.accounts.history.length': 3,
      'company.accounts.history.0': { year_end: '2025-03-31', filed: '2025-09-12', format: 'ixbrl', net_assets: 1250000, cash: 310000, employees: 42, turnover: 4200000 },
      'company.accounts.history.1.net_assets': 1105000,
      'company.accounts.history.2.net_assets': 980000.5,
      'company.accounts.history.2.employees': 0,
      'company.accounts.going_concern_doubt': false,
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Tau', 'OFF-TAU', tauDob)],
      pscs: [individualPsc('Mr Tau Example', tauDob)],
      filings: [
        { category: 'confirmation-statement', type: 'CS01', date: '2025-10-01', description: 'confirmation-statement-with-no-updates' },
        accountsFiling('DOC-ZZ11-2025', '2025-03-31', '2025-09-12'),
        accountsFiling('DOC-ZZ11-2024', '2024-03-31', '2024-09-10'),
        accountsFiling('DOC-ZZ11-2023', '2023-03-31', '2023-09-08'),
      ],
    }),
    '/officers/OFF-TAU/appointments': list(appointment('ZZ000011', 'PLACEHOLDER STEADY LTD')),
    ...ixbrlDocument('DOC-ZZ11-2025', ixbrl([
      { end: '2025-03-31', facts: { NetAssetsLiabilities: { v: '1,250', scale: 3 }, CashBankOnHand: '310,000', AverageNumberEmployeesDuringPeriod: { v: '42', sign: '-' }, TurnoverRevenue: { v: '4.2', scale: 6 } } },
      { end: '2024-03-31', facts: { NetAssetsLiabilities: '1,105,000', AverageNumberEmployeesDuringPeriod: '40' } },
    ], CLEAN_AUDIT)),
    ...ixbrlDocument('DOC-ZZ11-2024', ixbrl([
      { end: '2024-03-31', facts: { NetAssetsLiabilities: '1,100,000', AverageNumberEmployeesDuringPeriod: '40' } },
    ], CLEAN_AUDIT)),
    ...ixbrlDocument('DOC-ZZ11-2023', ixbrl([
      { end: '2023-03-31', facts: { NetAssetsLiabilities: { v: '980.000,50', format: 'ixt4:num-comma-decimal' }, AverageNumberEmployeesDuringPeriod: { v: '-', format: 'ixt4:fixed-zero' } } },
    ])),
  },
};
