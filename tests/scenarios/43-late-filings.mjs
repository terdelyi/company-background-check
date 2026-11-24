import { accountsFiling, appointment, company, companyRoutes, director, individualPsc, list } from './_helpers.mjs';

const number = 'ZZ000043';
const target = company(number, 'PLACEHOLDER OPCO LTD', {
  date_of_creation: '2023-05-29',
  accounts: { overdue: false, next_due: '2027-02-28', last_accounts: { made_up_to: '2025-05-31', type: 'micro-entity' } },
});
const dob = { month: 5, year: 1980 };
const accounts = (id, madeUpDate, filed) => accountsFiling(id, madeUpDate, filed, { links: {} });
const confirmation = (id, madeUpDate, filed) => ({
  transaction_id: id, category: 'confirmation-statement', type: 'CS01', date: filed,
  description: 'confirmation-statement-with-no-updates', description_values: { made_up_date: madeUpDate },
});

export default {
  description: 'Late first accounts and a late confirmation statement raise one low flag naming each filing and its deadline; an early confirmation filed within its review period is on time',
  args: [number],
  expect: {
    exit: 0,
    flags: ['low late_filing'],
    fields: {
      'flags.0.text': 'Filed late in the last 5 years: confirmation statement made up to 2024-05-28 filed 2024-07-10 (due 2024-06-12); accounts to 2024-05-31 filed 2025-05-11 (due 2025-02-28)',
      'flags.0.url': `https://find-and-update.company-information.service.gov.uk/company/${number}/filing-history`,
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Alpha Fortythree', 'OFF-ALPHA43', dob)],
      pscs: [individualPsc('Alpha Fortythree Example', dob)],
      filings: [
        accounts('AA-2025', '2025-05-31', '2026-02-10'),
        confirmation('CS-2025', '2025-05-01', '2025-06-05'),
        accounts('AA-2024', '2024-05-31', '2025-05-11'),
        confirmation('CS-2024', '2024-05-28', '2024-07-10'),
      ],
    }),
    '/officers/OFF-ALPHA43/appointments': list(appointment(number, target.company_name)),
  },
};
