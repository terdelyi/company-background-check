import { accountsFiling, appointment, company, companyRoutes, director, individualPsc, ixbrl, ixbrlDocument, list } from './_helpers.mjs';

const target = company('ZZ000023', 'PLACEHOLDER TAPERING LTD');
const phiDob = { month: 2, year: 1975 };
const years = [['2025', 28], ['2024', 30], ['2023', 33], ['2022', 36], ['2021', 40]];

export default {
  description: 'Five years of accounts are read, and staff cut by under a quarter each year but by 30% from the peak raise a headcount fall',
  args: ['ZZ000023'],
  expect: {
    exit: 0,
    flags: ['medium headcount_fall'],
    fields: {
      'company.accounts.history.length': 5,
      'company.accounts.history.4.employees': 40,
      'flags.0.text': 'Average employees fell from 40 to 28 (2021-12-31 to 2025-12-31)',
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Phitwentythree', 'OFF-PHI23', phiDob)],
      pscs: [individualPsc('Mr Phitwentythree Example', phiDob)],
      filings: years.map(([year]) => accountsFiling(`DOC-ZZ23-${year}`, `${year}-12-31`, `${Number(year) + 1}-06-01`)),
    }),
    '/officers/OFF-PHI23/appointments': list(appointment('ZZ000023', 'PLACEHOLDER TAPERING LTD')),
    ...Object.assign({}, ...years.map(([year, staff]) => ixbrlDocument(`DOC-ZZ23-${year}`, ixbrl([
      { end: `${year}-12-31`, facts: { NetAssetsLiabilities: '200,000', AverageNumberEmployeesDuringPeriod: String(staff) } },
    ])))),
  },
};
