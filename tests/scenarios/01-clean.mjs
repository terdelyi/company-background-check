import { appointment, company, companyRoutes, director, individualPsc, list, office } from './_helpers.mjs';

const target = company('ZZ000001', 'PLACEHOLDER CLEAN LTD');
const alphaDob = { month: 4, year: 1975 };

export default {
  description: 'Established company with clean directors raises no flags; an owner who is also a director is checked once',
  args: ['ZZ000001'],
  expect: {
    exit: 0,
    flags: [],
    fields: { 'company.status': 'active', 'directors.length': 2, 'pscs.length': 1, 'meta.directors_not_checked': 0 },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Alpha', 'OFF-ALPHA', alphaDob), director('SAMPLE, Beta Jane', 'OFF-BETA', { month: 9, year: 1982 })],
      pscs: [individualPsc('Mr Alpha Example', alphaDob)],
    }),
    '/officers/OFF-ALPHA/appointments': list(appointment('ZZ000001', 'PLACEHOLDER CLEAN LTD'), appointment('ZZ100001', 'UNRELATED GARDENS LTD')),
    '/officers/OFF-BETA/appointments': list(appointment('ZZ000001', 'PLACEHOLDER CLEAN LTD')),
    '/company/ZZ100001': company('ZZ100001', 'UNRELATED GARDENS LTD', { sic_codes: ['81300'], registered_office_address: office('ZZ8 8GG') }),
  },
};
