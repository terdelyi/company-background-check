import { appointment, company, companyRoutes, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000005', 'PLACEHOLDER CYCLE LTD', { date_of_creation: '2023-05-01', registered_office_address: office('ZZ5 5AA'), sic_codes: ['70229'] });
const closed = (number, name, created, ceased) => company(number, name, {
  company_status: 'dissolved', date_of_creation: created, date_of_cessation: ceased, registered_office_address: office('ZZ5 5AA'), sic_codes: ['70229'],
});

export default {
  description: 'An owner who is not a director is found through the officer search, a namesake with another birth date is ignored, and three closed look-alike companies are serial cycling',
  args: ['ZZ000005'],
  expect: {
    exit: 0,
    flags: ['high company_cycling'],
    fields: {
      'directors.length': 2,
      'directors.1.role': 'owner (PSC), not a director',
      'directors.1.officer_records': 1,
      'directors.1.related_companies.length': 3,
      'meta.people_without_officer_record': [],
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Xi', 'OFF-XI', { month: 3, year: 1988 }, { appointed_on: '2023-05-01' })],
      pscs: [individualPsc('Mr Omicron Sample', { month: 2, year: 1968 })],
    }),
    '/officers/OFF-XI/appointments': list(appointment('ZZ000005', 'PLACEHOLDER CYCLE LTD')),
    '/search/officers?q=Omicron Sample': list(
      { title: 'Omicron SAMPLE', date_of_birth: { month: 2, year: 1968 }, links: { self: '/officers/OFF-OMICRON/appointments' } },
      { title: 'Omicron SAMPLE', date_of_birth: { month: 7, year: 1990 }, links: { self: '/officers/OFF-NAMESAKE/appointments' } },
    ),
    '/officers/OFF-OMICRON/appointments': list(
      appointment('ZZ100051', 'PLACEHOLDER CYCLE 2017 LTD', 'dissolved', { resigned_on: '2019-09-01' }),
      appointment('ZZ100052', 'PLACEHOLDER CYCLE 2019 LTD', 'dissolved', { resigned_on: '2021-07-01' }),
      appointment('ZZ100053', 'PLACEHOLDER CYCLE 2021 LTD', 'dissolved', { resigned_on: '2023-08-01' }),
    ),
    '/company/ZZ100051': closed('ZZ100051', 'PLACEHOLDER CYCLE 2017 LTD', '2017-04-01', '2019-10-01'),
    '/company/ZZ100052': closed('ZZ100052', 'PLACEHOLDER CYCLE 2019 LTD', '2019-05-01', '2021-08-01'),
    '/company/ZZ100053': closed('ZZ100053', 'PLACEHOLDER CYCLE 2021 LTD', '2021-06-01', '2023-09-01'),
  },
};
