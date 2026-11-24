import { appointment, company, companyRoutes, corporatePsc, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000033', 'PLACEHOLDER GROUPWORKS PLC', { registered_office_address: office('ZZ33 4AA') });
const names = ['PLACEHOLDER GROUPWORKS IP LTD', 'PLACEHOLDER GROUPWORKS FINANCE LTD', 'PLACEHOLDER GROUPWORKS TRADING LTD', 'PLACEHOLDER GROUPWORKS SERVICES LTD', 'PLACEHOLDER GROUPWORKS LENDING LTD'];
const numbers = ['ZZ100331', 'ZZ100332', 'ZZ100333', 'ZZ100334', 'ZZ100335'];
const closed = (number, name, year) => company(number, name, { company_status: 'dissolved', date_of_creation: `${year}-01-01`, date_of_cessation: '2025-12-23', registered_office_address: office('ZZ33 4AA') });
const owner = extra => corporatePsc('Placeholder Groupworks plc', target.company_number, 'England', extra);
const owners = (number, ...pscs) => ({ [`/company/${number}/persons-with-significant-control`]: list(...pscs) });

export default {
  description: 'Unproven group links do not suppress cycling; a shorter confirmed route remains usable after a depth-limited miss',
  args: [target.company_number],
  expect: {
    exit: 0,
    flags: ['high company_cycling', 'low serial_dissolutions'],
    fields: {
      'company.parents.length': 0,
      'company.ir35_size.part_of_group': false,
      'directors.0.related_companies.length': 5,
      'directors.0.related_companies.0.group_member': false,
      'directors.0.related_companies.1.group_member': false,
      'directors.0.related_companies.2.group_member': false,
      'directors.0.related_companies.3.group_member': false,
      'directors.0.related_companies.4.group_member': true,
      'meta.group_ownership_not_followed': [
        { name: 'Placeholder Groupworks plc', owner_of: numbers[0], reason: 'PSC record does not establish majority control', psc_url: 'https://find-and-update.company-information.service.gov.uk/company/ZZ100331/persons-with-significant-control' },
        { name: 'Placeholder Groupworks plc', owner_of: numbers[1], reason: 'PSC ceased on 2020-01-01', psc_url: 'https://find-and-update.company-information.service.gov.uk/company/ZZ100332/persons-with-significant-control' },
        { name: 'Placeholder Groupworks plc', owner_of: numbers[2], reason: 'PSC record does not establish majority control', psc_url: 'https://find-and-update.company-information.service.gov.uk/company/ZZ100333/persons-with-significant-control' },
        { name: 'Placeholder Groupworks plc', owner_of: numbers[3], reason: 'PSC record does not establish majority control', psc_url: 'https://find-and-update.company-information.service.gov.uk/company/ZZ100334/persons-with-significant-control' },
      ],
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Chi', 'OFF-CHI33', { month: 6, year: 1979 })], pscs: [individualPsc('Mr Chi Example', { month: 6, year: 1979 })] }),
    '/officers/OFF-CHI33/appointments': list(appointment(target.company_number, target.company_name), ...numbers.map((number, i) => appointment(number, names[i], 'dissolved'))),
    ...Object.fromEntries(numbers.map((number, i) => [`/company/${number}`, closed(number, names[i], 2016 + i)])),
    ...Object.fromEntries([...numbers, 'ZZ100336', 'ZZ100337', 'ZZ100338'].map(n => [`/company/${n}/filing-history`, list()])),
    ...owners(numbers[0], owner({ natures_of_control: ['ownership-of-shares-25-to-50-percent'] })),
    ...owners(numbers[1], owner({ ceased_on: '2020-01-01' })),
    ...owners(numbers[2], owner({ natures_of_control: ['significant-influence-or-control'] })),
    ...owners(numbers[3], owner({ natures_of_control: [] })),
    // Try a four-edge route first, then a three-edge route to the same known group.
    ...owners(numbers[4], corporatePsc('Placeholder Midco Limited', 'ZZ100336', 'England'), corporatePsc('Placeholder Topco Plc', 'ZZ100337', 'England')),
    '/company/ZZ100336': company('ZZ100336', 'PLACEHOLDER MIDCO LIMITED'),
    '/company/ZZ100337': company('ZZ100337', 'PLACEHOLDER TOPCO PLC'),
    '/company/ZZ100338': company('ZZ100338', 'PLACEHOLDER HOLDCO LIMITED'),
    ...owners('ZZ100336', corporatePsc('Placeholder Topco Plc', 'ZZ100337', 'England')),
    ...owners('ZZ100337', corporatePsc('Placeholder Holdco Limited', 'ZZ100338', 'England')),
    ...owners('ZZ100338', owner({})),
  },
};
