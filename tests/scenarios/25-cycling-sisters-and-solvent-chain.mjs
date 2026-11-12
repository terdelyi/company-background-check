import { appointment, company, companyRoutes, corporatePsc, director, individualPsc, list, office } from './_helpers.mjs';

const parent = company('ZZ200025', 'PLACEHOLDER HARBOUR HOLDINGS LTD', { registered_office_address: office('ZZ25 9AA') });
const target = company('ZZ000025', 'PLACEHOLDER HARBOUR LTD', { registered_office_address: office('ZZ25 1AA') });
const sister = company('ZZ100250', 'PLACEHOLDER HARBOUR MARINE LTD', {
  company_status: 'dissolved', date_of_creation: '2016-01-01', date_of_cessation: '2023-05-01', registered_office_address: office('ZZ25 1AA'),
});
// closed by members' voluntary liquidation, outside the group
const wound = (number, name, created) => company(number, name, {
  company_status: 'liquidation', has_insolvency_history: true, date_of_creation: created, registered_office_address: office('ZZ25 1AA'),
});
const rhoDob = { month: 2, year: 1971 };

export default {
  description: 'A closed sister company owned by the target\'s parent is group housekeeping, and a chain of solvent liquidations is listed as such but stays medium',
  args: ['ZZ000025'],
  expect: {
    exit: 0,
    flags: ['medium company_cycling'],
    fields: {
      'directors.0.related_companies.length': 4,
      'directors.0.related_companies.0.group_member': true,
      'directors.0.related_companies.1.solvent_liquidation': true,
      'directors.0.related_companies.1.group_member': false,
      'flags.0.text': 'EXAMPLE, Rho: 3 closed companies in the last 10 years with a similar name or the same registered postcode, 3 of them in solvent liquidation - PLACEHOLDER HARBOUR FREIGHT LTD (2017-solvent liquidation), PLACEHOLDER HARBOUR DOCKS LTD (2018-solvent liquidation), PLACEHOLDER HARBOUR CRANES LTD (2019-solvent liquidation) (1 closed company in the target\'s own group left out)',
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Rho', 'OFF-RHO25', rhoDob)],
      pscs: [corporatePsc('Placeholder Harbour Holdings Ltd', 'ZZ200025', 'England')],
    }),
    ...companyRoutes(parent, { pscs: [individualPsc('Mr Rho Example', rhoDob)] }),
    '/officers/OFF-RHO25/appointments': list(
      appointment('ZZ000025', 'PLACEHOLDER HARBOUR LTD'),
      appointment('ZZ100250', 'PLACEHOLDER HARBOUR MARINE LTD', 'dissolved'),
      appointment('ZZ100251', 'PLACEHOLDER HARBOUR FREIGHT LTD', 'liquidation'),
      appointment('ZZ100252', 'PLACEHOLDER HARBOUR DOCKS LTD', 'liquidation'),
      appointment('ZZ100253', 'PLACEHOLDER HARBOUR CRANES LTD', 'liquidation'),
    ),
    '/company/ZZ100250': sister,
    '/company/ZZ100250/persons-with-significant-control': list(corporatePsc('Placeholder Harbour Holdings Ltd', 'ZZ200025', 'England')),
    ...Object.assign({}, ...[['ZZ100251', 'PLACEHOLDER HARBOUR FREIGHT LTD', '2017-01-01'], ['ZZ100252', 'PLACEHOLDER HARBOUR DOCKS LTD', '2018-01-01'], ['ZZ100253', 'PLACEHOLDER HARBOUR CRANES LTD', '2019-01-01']]
      .map(([number, name, created]) => ({
        [`/company/${number}`]: wound(number, name, created),
        [`/company/${number}/insolvency`]: { cases: [{ type: 'members-voluntary-liquidation' }] },
        [`/company/${number}/persons-with-significant-control`]: list(individualPsc('Mr Sigma Sample', { month: 1, year: 1960 })),
      }))),
  },
};
