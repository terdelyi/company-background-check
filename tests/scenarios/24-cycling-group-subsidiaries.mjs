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
      'directors.0.related_companies.3.group_member': false,
      'meta.group_ownership_not_followed.0.reason': 'UK register not established (Registrar of Companies, Hong Kong)',
      'meta.group_ownership_not_followed.1.reason': 'UK register not established (governing law is Delaware General Corporation Law)',
      'meta.group_ownership_not_followed.0.psc_url': 'https://find-and-update.company-information.service.gov.uk/company/ZZ100243/persons-with-significant-control',
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
    ...Object.fromEntries(['ZZ100241', 'ZZ100242', 'ZZ100243', 'ZZ100244', 'ZZ100245'].map(n => [`/company/${n}/filing-history`, list()])),
    ...owners('ZZ100241', corporatePsc('Placeholder Groupworks plc', 'ZZ000024', undefined, { identification: { registration_number: 'ZZ000024', place_registered: 'Companies House, Cardiff' } })),
    ...owners('ZZ100242', { kind: 'legal-person-with-significant-control', name: 'Placeholder Groupworks Lending Limited', identification: { legal_form: 'Limited Company', legal_authority: 'Companies Act 2006' }, natures_of_control: ['voting-rights-75-to-100-percent'], notified_on: '2016-04-06' }),
    '/search/companies?q=Placeholder Groupworks Lending Limited': {
      total_results: 1, items: [{ company_number: 'ZZ100245', title: 'PLACEHOLDER GROUPWORKS LENDING LTD', company_status: 'dissolved', date_of_creation: '2015-01-01', date_of_cessation: '2026-01-01', address: office('ZZ24 4AA') }],
    },
    '/company/ZZ100245': closed('ZZ100245', 'PLACEHOLDER GROUPWORKS LENDING LTD', '2015-01-01', '2026-01-01'),
    ...owners('ZZ100245', corporatePsc('Placeholder Groupworks plc', 'ZZ000024', 'England')),
    ...owners('ZZ100243', corporatePsc('Placeholder Groupworks plc', 'ZZ000024', 'Netherlands', { identification: { registration_number: 'ZZ000024', place_registered: 'Registrar of Companies, Hong Kong' } })),
    ...owners('ZZ100244', corporatePsc('Placeholder Groupworks plc', undefined, undefined, { identification: { legal_authority: 'Delaware General Corporation Law' } })),
    '/search/companies?q=Placeholder Groupworks plc': { items: [{ company_number: target.company_number, title: target.company_name, company_status: 'active' }] },
  },
};
