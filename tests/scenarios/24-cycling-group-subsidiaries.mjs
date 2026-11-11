import { appointment, company, companyRoutes, corporatePsc, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000024', 'PLACEHOLDER GROUPWORKS PLC', { type: 'plc', registered_office_address: office('ZZ24 4AA'), sic_codes: ['64922'] });
const closed = (number, name, created, ceased) => company(number, name, {
  company_status: 'dissolved', date_of_creation: created, date_of_cessation: ceased, registered_office_address: office('ZZ24 4AA'), sic_codes: ['64922'],
});
const owners = (number, ...pscs) => ({ [`/company/${number}/persons-with-significant-control`]: list(...pscs) });
const chiDob = { month: 6, year: 1979 };

export default {
  description: 'Closed look-alike companies owned by the target, directly or through a subsidiary recorded only by name, are not counted as cycling, while the others still are',
  args: ['ZZ000024'],
  expect: {
    exit: 0,
    flags: ['medium company_cycling'],
    fields: {
      'directors.0.related_companies.length': 4,
      'directors.0.related_companies.0.group_member': true,
      'directors.0.related_companies.1.group_member': true,
      'directors.0.related_companies.2.group_member': false,
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Chi', 'OFF-CHI24', chiDob)],
      pscs: [individualPsc('Mr Chi Example', chiDob)],
    }),
    '/officers/OFF-CHI24/appointments': list(
      appointment('ZZ000024', 'PLACEHOLDER GROUPWORKS PLC'),
      appointment('ZZ100241', 'PLACEHOLDER GROUPWORKS IP LTD', 'dissolved'),
      appointment('ZZ100242', 'PLACEHOLDER GROUPWORKS FINANCE LTD', 'dissolved'),
      appointment('ZZ100243', 'PLACEHOLDER GROUPWORKS TRADING LTD', 'dissolved'),
      appointment('ZZ100244', 'PLACEHOLDER GROUPWORKS SERVICES LTD', 'dissolved'),
    ),
    '/company/ZZ100241': closed('ZZ100241', 'PLACEHOLDER GROUPWORKS IP LTD', '2016-01-01', '2022-06-14'),
    '/company/ZZ100242': closed('ZZ100242', 'PLACEHOLDER GROUPWORKS FINANCE LTD', '2017-01-01', '2025-12-23'),
    '/company/ZZ100243': closed('ZZ100243', 'PLACEHOLDER GROUPWORKS TRADING LTD', '2018-01-01', '2020-03-01'),
    '/company/ZZ100244': closed('ZZ100244', 'PLACEHOLDER GROUPWORKS SERVICES LTD', '2019-01-01', '2024-03-01'),
    ...owners('ZZ100241', corporatePsc('Placeholder Groupworks plc', 'ZZ000024', 'England')),
    ...owners('ZZ100242', { kind: 'legal-person-person-with-significant-control', name: 'Placeholder Groupworks Lending Limited', identification: { legal_form: 'Limited Company', legal_authority: 'Companies Act' } }),
    '/search/companies?q=Placeholder Groupworks Lending Limited': {
      items: [{ company_number: 'ZZ100245', title: 'PLACEHOLDER GROUPWORKS LENDING LTD', company_status: 'dissolved', address: office('ZZ24 4AA') }],
    },
    ...owners('ZZ100245', corporatePsc('Placeholder Groupworks plc', 'ZZ000024', 'England')),
    ...owners('ZZ100243', individualPsc('Mr Psi Sample', { month: 1, year: 1960 })),
  },
};
