import { appointment, company, companyRoutes, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000006', 'ZETAQUILL HOLDINGS LIMITED', { date_of_creation: '2018-01-01', registered_office_address: office('ZZ6 6AA') });
const piDob = { month: 12, year: 1977 };

export default {
  description: 'An exact name match is picked over a near one, and a brand passed with --aka links an insolvent company with a different registered name',
  args: ['Zetaquill Holdings Limited', '--aka', 'PlaceholderDesk'],
  expect: {
    exit: 0,
    flags: ['high phoenix_strong'],
    fields: {
      'company.number': 'ZZ000006',
      'company.also_known_as': ['PlaceholderDesk'],
      'directors.0.failed_companies.0.signals': ['insolvency', 'similar name', 'same SIC code'],
    },
  },
  routes: {
    '/search/companies?q=Zetaquill Holdings Limited': {
      items: [
        { company_number: 'ZZ000006', title: 'ZETAQUILL HOLDINGS LIMITED', company_status: 'active' },
        { company_number: 'ZZ000060', title: 'ZETAQUILL HOLDINGS GROUP LIMITED', company_status: 'active' },
      ],
    },
    ...companyRoutes(target, { officers: [director('EXAMPLE, Pi', 'OFF-PI', piDob)], pscs: [individualPsc('Ms Pi Example', piDob)] }),
    '/officers/OFF-PI/appointments': list(
      appointment('ZZ000006', 'ZETAQUILL HOLDINGS LIMITED'),
      appointment('ZZ100061', 'PLACEHOLDERDESK SOFTWARE LTD', 'administration'),
    ),
    '/company/ZZ100061': company('ZZ100061', 'PLACEHOLDERDESK SOFTWARE LTD', {
      company_status: 'administration', has_insolvency_history: true, date_of_creation: '2012-01-01', registered_office_address: office('ZZ6 9XX'),
    }),
  },
};
