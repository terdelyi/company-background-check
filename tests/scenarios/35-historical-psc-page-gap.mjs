import { appointment, company, companyRoutes, corporatePsc, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000035', 'PLACEHOLDER HARBOUR LTD', { registered_office_address: office('ZZ35 1AA') });
const closed = company('ZZ100351', 'PLACEHOLDER HARBOUR MARINE LTD', { company_status: 'dissolved', date_of_creation: '2016-01-01', date_of_cessation: '2023-05-01', registered_office_address: office('ZZ35 1AA') });
const closed2 = company('ZZ100352', 'PLACEHOLDER HARBOUR DOCKS LTD', { company_status: 'dissolved', date_of_creation: '2016-01-01', date_of_cessation: '2023-05-01', registered_office_address: office('ZZ35 1AA') });
const dob = { month: 2, year: 1971 };
const psc = individualPsc('Mr Rho Example', dob);

export default {
  description: 'A failed later PSC page leaves cycling evidence and reports the historical ownership gap',
  args: [target.company_number],
  expect: {
    exit: 0,
    flags: ['medium company_cycling'],
    fields: {
      'directors.0.related_companies.0.group_member': false,
      'directors.0.related_companies.0.group_membership_gap.as_of': '2023-05-01',
      'directors.0.related_companies.0.group_membership_gap.reasons': ['PSC register incomplete', 'group membership not established at closure'],
      'meta.psc_paging.ZZ100351.complete': false,
      'directors.0.related_companies.1.group_member': false,
      'meta.psc_paging.ZZ100352.complete': false,
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Rho', 'OFF-RHO35', dob)], pscs: [psc] }),
    '/officers/OFF-RHO35/appointments': list(appointment(target.company_number, target.company_name), appointment(closed.company_number, closed.company_name, 'dissolved'), appointment(closed2.company_number, closed2.company_name, 'dissolved')),
    '/company/ZZ100351': closed,
    ...Object.fromEntries(['ZZ100351', 'ZZ100352'].map(n => [`/company/${n}/filing-history`, list()])),
    '/company/ZZ100352': closed2,
    '/company/ZZ100352/persons-with-significant-control': { items: [corporatePsc(target.company_name, target.company_number, 'England'), ...Array(49).fill(psc)], total_results: 100 },
    '/company/ZZ100352/persons-with-significant-control?start_index=50': { items: [corporatePsc(target.company_name, target.company_number, 'England'), ...Array(49).fill(psc)], total_results: 100 },
    '/company/ZZ100351/persons-with-significant-control': { items: [corporatePsc(target.company_name, target.company_number, 'England'), ...Array(49).fill(psc)], total_results: 51 },
    '/company/ZZ100351/persons-with-significant-control?start_index=50': { failFirst: 100, failStatus: 404, then: list() },
  },
};
