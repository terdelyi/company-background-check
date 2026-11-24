import { appointment, company, companyRoutes, corporatePsc, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000034', 'PLACEHOLDER HARBOUR LTD', { registered_office_address: office('ZZ34 1AA') });
const parent = company('ZZ200034', 'PLACEHOLDER HARBOUR HOLDINGS LTD', { previous_company_names: [{ name: 'PLACEHOLDER MIDCO LIMITED', effective_from: '2015-03-01', ceased_on: '2022-01-01' }] });
const currentParent = company('ZZ200035', 'PLACEHOLDER HARBOUR HOLDINGS LTD', { date_of_creation: '2024-01-01' });
const names = ['PLACEHOLDER HARBOUR FREIGHT LTD', 'PLACEHOLDER HARBOUR DOCKS LTD', 'PLACEHOLDER HARBOUR CRANES LTD', 'PLACEHOLDER HARBOUR MARINE LTD', 'PLACEHOLDER GROUPWORKS IP LTD', 'PLACEHOLDER GROUPWORKS FINANCE LTD'];
const numbers = ['ZZ100341', 'ZZ100342', 'ZZ100343', 'ZZ100344', 'ZZ100346', 'ZZ100347'];
const dob = { month: 2, year: 1971 };
const owner = (name, number, extra = {}) => corporatePsc(name, number, 'England', extra);
const dummy = individualPsc('Mr Rho Example', dob);
const page = (items, total_results = 51) => ({ items, total_results });
const pscPath = number => `/company/${number}/persons-with-significant-control`;

export default {
  description: 'PSC pagination and dated ownership distinguish a valid former group link from links ended before closure or unsupported at closure',
  args: [target.company_number],
  expect: {
    exit: 0,
    flags: ['high company_cycling', 'low serial_dissolutions'],
    fields: {
      'company.parents.0.number': currentParent.company_number,
      'directors.0.related_companies.length': 6,
      'directors.0.related_companies.0.group_member': false,
      'directors.0.related_companies.1.group_member': true,
      'directors.0.related_companies.2.group_member': false,
      'directors.0.related_companies.3.group_member': false,
      'directors.0.related_companies.3.group_membership_gap.reasons.0': 'owner could not be uniquely matched at the relevant date',
      'directors.0.related_companies.4.group_member': false,
      'directors.0.related_companies.4.ceased': null,
      'directors.0.related_companies.5.group_member': false,
      'directors.0.related_companies.5.group_membership_gap.reasons.1': 'PSC control change dated 2024-01-01 cannot be established at the relevant date',
      'directors.0.related_companies.5.group_membership_gap.source_urls.0': 'https://find-and-update.company-information.service.gov.uk/company/ZZ100347/filing-history',
      'flags.0.text': "EXAMPLE, Rho: 5 closed companies in the last 10 years with a similar name or the same registered postcode - PLACEHOLDER HARBOUR FREIGHT LTD (2016-2023), PLACEHOLDER HARBOUR CRANES LTD (2016-2023), PLACEHOLDER HARBOUR MARINE LTD (2016-2023), PLACEHOLDER GROUPWORKS IP LTD (2016-closed), PLACEHOLDER GROUPWORKS FINANCE LTD (2016-2023) (1 closed company in the target's own group left out)",
      'directors.0.related_companies.4.group_membership_gap.as_of': null,
      'directors.0.related_companies.4.group_membership_gap.reasons': ['closure date unavailable or invalid'],
      'directors.0.related_companies.1.group_membership.as_of': '2023-05-01',
      'directors.0.related_companies.1.group_membership.common_company_number': parent.company_number,
      'directors.0.related_companies.1.group_membership.related_path.0.owner_number': 'ZZ100345',
      'directors.0.related_companies.1.group_membership.related_path.1.owner_number': parent.company_number,
      'directors.0.related_companies.1.group_membership.related_path.1.matched_by': 'registration_number',
      'directors.0.related_companies.1.group_membership.related_path.1.psc_url': 'https://find-and-update.company-information.service.gov.uk/company/ZZ100345/persons-with-significant-control',
      'directors.0.related_companies.1.group_membership.related_path.1.notified_on': '2016-04-06',
      'directors.0.related_companies.1.group_membership.related_path.1.ceased_on': '2024-01-01',
      'directors.0.related_companies.1.group_membership.target_path.0.owner_number': parent.company_number,
      'directors.0.related_companies.1.group_membership.target_path.0.psc_url': 'https://find-and-update.company-information.service.gov.uk/company/ZZ000034/persons-with-significant-control',
      'directors.0.related_companies.2.group_membership_gap.as_of': '2023-05-01',
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Rho', 'OFF-RHO34', dob)] }),
    ...companyRoutes(parent, { pscs: [dummy] }),
    ...companyRoutes(currentParent, { pscs: [dummy] }),
    [pscPath(target.company_number)]: page(Array(50).fill(dummy), 52),
    [`${pscPath(target.company_number)}?start_index=50`]: page([owner(parent.company_name, parent.company_number, { ceased_on: '2024-01-01' }), owner(currentParent.company_name, currentParent.company_number, { notified_on: '2016-04-06' })], 52),
    '/officers/OFF-RHO34/appointments': list(appointment(target.company_number, target.company_name), ...numbers.map((n, i) => appointment(n, names[i], 'dissolved'))),
    ...Object.fromEntries(numbers.map((n, i) => [`/company/${n}`, company(n, names[i], { company_status: 'dissolved', date_of_creation: '2016-01-01', date_of_cessation: '2023-05-01', registered_office_address: office('ZZ34 1AA') })])),
    '/company/ZZ100345': company('ZZ100345', 'PLACEHOLDER MIDCO LIMITED'),
    '/company/ZZ100346': company('ZZ100346', names[4], { company_status: 'dissolved', date_of_creation: '2016-01-01', date_of_cessation: 'not-a-date', registered_office_address: office('ZZ34 1AA') }),
    ...Object.fromEntries([...numbers, 'ZZ100345'].map(n => [`/company/${n}/filing-history`, list()])),
    [pscPath(numbers[0])]: list(owner(parent.company_name, parent.company_number, { ceased_on: '2022-12-31' })),
    [pscPath(numbers[1])]: list(owner('Placeholder Midco Limited', 'ZZ100345')),
    [pscPath('ZZ100345')]: page(Array(50).fill(dummy)),
    [`${pscPath('ZZ100345')}?start_index=50`]: page([owner(parent.company_name, parent.company_number, { ceased_on: '2024-01-01' })]),
    [pscPath(numbers[2])]: list(owner(parent.company_name, parent.company_number, { notified_on: undefined })),
    '/company/ZZ100347/filing-history': list({ type: 'PSC05', description_values: { psc_name: 'PLACEHOLDER MIDCO LIMITED', change_date: '2024-01-01' } }),
    [pscPath(numbers[5])]: list(owner(parent.company_name, parent.company_number)),
    [pscPath(numbers[4])]: list(owner(target.company_name, target.company_number)),
    [pscPath(numbers[3])]: list(owner(currentParent.company_name, currentParent.company_number, { notified_on: '2016-04-06' })),
  },
};
