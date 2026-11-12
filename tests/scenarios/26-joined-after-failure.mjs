import { appointment, company, companyRoutes, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000026', 'PLACEHOLDER LANTERN LTD', { date_of_creation: '2023-04-01', registered_office_address: office('ZZ26 1AA') });
const tauDob = { month: 7, year: 1980 };

export default {
  description: 'A director appointed to an old company years after its insolvency started did not run it into failure, so it is no phoenix pattern and not counted as their insolvency',
  args: ['ZZ000026'],
  expect: {
    exit: 0,
    flags: [],
    fields: {
      'directors.0.failed_companies.length': 1,
      'directors.0.failed_companies.0.director_joined_after_failure': true,
      'directors.0.failed_companies.0.phoenix': null,
      'directors.0.failed_companies.0.signals': ['insolvency', 'similar name', 'same registered postcode', 'same SIC code'],
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Tau', 'OFF-TAU26', tauDob, { appointed_on: '2023-04-01' })], pscs: [individualPsc('Mr Tau Example', tauDob)] }),
    '/officers/OFF-TAU26/appointments': list(
      appointment('ZZ000026', 'PLACEHOLDER LANTERN LTD', 'active', { appointed_on: '2023-04-01' }),
      appointment('ZZ100026', 'PLACEHOLDER LANTERN SUPPLIES LTD', 'voluntary-arrangement', { appointed_on: '2023-04-01' }),
    ),
    ...companyRoutes(company('ZZ100026', 'PLACEHOLDER LANTERN SUPPLIES LTD', {
      company_status: 'voluntary-arrangement', has_insolvency_history: true, date_of_creation: '1998-01-01', registered_office_address: office('ZZ26 1AA'),
    }), { insolvency: { cases: [{ type: 'corporate-voluntary-arrangement', dates: [{ date: '2004-02-01', type: 'instrumented-on' }] }] } }),
  },
};
