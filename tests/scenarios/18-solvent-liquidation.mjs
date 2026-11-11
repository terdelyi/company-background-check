import { appointment, company, companyRoutes, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000018', 'PLACEHOLDER GROUPCO LTD', { date_of_creation: '2024-03-01', registered_office_address: office('ZZ18 1AA') });
const sister = company('ZZ100018', 'PLACEHOLDER GROUPCO SOURCING LTD', {
  company_status: 'liquidation', has_insolvency_history: true, date_of_creation: '2011-01-01', registered_office_address: office('ZZ18 1AA'),
});
const betaDob = { month: 3, year: 1974 };

export default {
  description: 'A director\'s other company in members\' voluntary liquidation (a solvent wind-up) is not insolvency, so the same name, office and SIC are no phoenix pattern',
  args: ['ZZ000018'],
  expect: {
    exit: 0,
    flags: [],
    fields: {
      'directors.0.failed_companies.length': 1,
      'directors.0.failed_companies.0.phoenix': null,
      'directors.0.failed_companies.0.solvent_liquidation': true,
      'directors.0.failed_companies.0.signals': ['similar name', 'same registered postcode', 'same SIC code'],
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Beta Two', 'OFF-BETA2', betaDob)], pscs: [individualPsc('Mr Beta Two Example', betaDob)] }),
    '/officers/OFF-BETA2/appointments': list(appointment('ZZ000018', 'PLACEHOLDER GROUPCO LTD'), appointment('ZZ100018', 'PLACEHOLDER GROUPCO SOURCING LTD', 'liquidation')),
    '/company/ZZ100018': sister,
    '/company/ZZ100018/insolvency': { cases: [{ type: 'members-voluntary-liquidation' }] },
  },
};
