import { appointment, company, companyRoutes, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000003', 'PLACEHOLDER WIDGETS LTD', { date_of_creation: '2024-02-01', registered_office_address: office('ZZ3 3AA') });
const nuDob = { month: 11, year: 1972 };

export default {
  description: 'A director\'s insolvent company with a similar name, the same SIC and a shared earlier office is a strong phoenix; a plain dissolved company is ignored',
  args: ['ZZ000003'],
  expect: {
    exit: 0,
    flags: ['high phoenix_strong'],
    fields: {
      'flags.0.record': 'director',
      'directors.0.failed_companies.length': 1,
      'directors.0.failed_companies.0.number': 'ZZ100003',
      'directors.0.failed_companies.0.phoenix': 'strong',
      'directors.0.failed_companies.0.signals': [
        'insolvency', 'similar name', 'shared previous registered postcode', 'same SIC code',
        'target incorporated recently while this company is insolvent',
      ],
      'directors.0.dissolved': 1,
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Nu', 'OFF-NU', nuDob)], pscs: [individualPsc('Mr Nu Example', nuDob)] }),
    '/officers/OFF-NU/appointments': list(
      appointment('ZZ000003', 'PLACEHOLDER WIDGETS LTD'),
      appointment('ZZ100003', 'PLACEHOLDER WIDGETS TRADING LTD', 'liquidation'),
      appointment('ZZ100004', 'UNRELATED BAKERY LTD', 'dissolved'),
    ),
    '/company/ZZ100003': company('ZZ100003', 'PLACEHOLDER WIDGETS TRADING LTD', {
      company_status: 'liquidation', has_insolvency_history: true, date_of_creation: '2016-05-01', registered_office_address: office('ZZ9 9LQ'),
    }),
    '/company/ZZ100003/insolvency': { cases: [{ type: 'creditors-voluntary-liquidation' }] },
    '/company/ZZ100003/filing-history?category=address': list({
      date: '2024-03-10',
      description: 'change-registered-office-address-company-with-date-old-address-new-address',
      description_values: { old_address: '1 Example Street, Testtown, ZZ3 3AA', new_address: 'Insolvency House, Testtown, ZZ9 9LQ' },
    }),
    '/company/ZZ100004': company('ZZ100004', 'UNRELATED BAKERY LTD', {
      company_status: 'dissolved', date_of_cessation: '2019-06-01', sic_codes: ['10710'], registered_office_address: office('ZZ7 7BB'),
    }),
  },
};
