import { appointment, company, companyRoutes, director, individualPsc, list } from './_helpers.mjs';

const target = company('ZZ000007', 'PLACEHOLDER DISQ LTD');
const thetaDob = { month: 5, year: 1970 };

export default {
  description: 'A disqualified-register hit with a matching birth month is high, a name-only hit is medium, and a hit with another birth date is dropped',
  args: ['ZZ000007'],
  expect: {
    exit: 0,
    flags: ['high disqualification', 'medium disqualification'],
    fields: {
      'directors.0.disqualification': 'name and birth month/year match',
      'directors.1.disqualification': 'name match only - verify',
      'directors.2.disqualification': null,
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [
        director('THETA, Example', 'OFF-THETA', thetaDob),
        director('IOTA, Example', 'OFF-IOTA', { month: 1, year: 1980 }),
        director('RHO, Example', 'OFF-RHO', { month: 3, year: 1985 }),
      ],
      pscs: [individualPsc('Mr Example Theta', thetaDob)],
    }),
    '/officers/OFF-THETA/appointments': list(appointment('ZZ000007', 'PLACEHOLDER DISQ LTD')),
    '/officers/OFF-IOTA/appointments': list(appointment('ZZ000007', 'PLACEHOLDER DISQ LTD')),
    '/officers/OFF-RHO/appointments': list(appointment('ZZ000007', 'PLACEHOLDER DISQ LTD')),
    '/search/disqualified-officers?q=THETA, Example': list({ title: 'Example THETA', date_of_birth: '1970-05-12' }),
    '/search/disqualified-officers?q=IOTA, Example': list({ title: 'Example IOTA' }),
    '/search/disqualified-officers?q=RHO, Example': list({ title: 'Example RHO', date_of_birth: '1961-11-02' }),
  },
};
