import { accountsFiling, appointment, company, companyRoutes, director, individualPsc, list } from './_helpers.mjs';

const number = 'ZZ000044';
const target = company(number, 'PLACEHOLDER OPCO LTD', { date_of_creation: '2020-01-15' });
const dob = { month: 5, year: 1980 };
const accounts = (id, madeUpDate, filed) => accountsFiling(id, madeUpDate, filed, { links: {} });

export default {
  description: 'A change of year-end makes the deadline unclear, so those accounts are listed for checking instead of flagged; repeated late filing is medium',
  args: [number],
  expect: {
    exit: 0,
    flags: ['medium late_filing', 'low year_end_extended'],
    fields: {
      'flags.0.text': 'Filed late in the last 5 years: accounts to 2022-03-31 filed 2023-01-10 (due 2022-12-31); accounts to 2023-03-31 filed 2024-01-20 (due 2023-12-31); accounts to 2024-03-31 filed 2025-02-01 (due 2024-12-31)',
      'meta.late_filing_unclear': ['accounts to 2025-06-30: the year-end was changed on 2025-07-20, so the deadline needs checking'],
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Alpha Fortyfour', 'OFF-ALPHA44', dob)],
      pscs: [individualPsc('Alpha Fortyfour Example', dob)],
      filings: [
        { transaction_id: 'AA01-44', category: 'accounts', type: 'AA01', date: '2025-07-20', description: 'change-account-reference-date-company-current-extended', description_values: { new_date: '2025-06-30' } },
        accounts('AA-2025', '2025-06-30', '2026-05-20'),
        accounts('AA-2024', '2024-03-31', '2025-02-01'),
        accounts('AA-2023', '2023-03-31', '2024-01-20'),
        accounts('AA-2022', '2022-03-31', '2023-01-10'),
        accounts('AA-2021', '2021-03-31', '2021-10-01'),
      ],
    }),
    '/officers/OFF-ALPHA44/appointments': list(appointment(number, target.company_name)),
  },
};
