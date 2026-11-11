import { appointment, company, companyRoutes, director, individualPsc, list } from './_helpers.mjs';

const target = company('ZZ000015', 'PLACEHOLDER QUIET LTD');
const psiDob = { month: 1, year: 1990 };

export default {
  description: 'An unreachable Gazette loses only that check: the run still succeeds and records the failed search',
  args: ['ZZ000015'],
  env: { GAZETTE_BASE: 'http://127.0.0.1:9' },
  expect: {
    exit: 0,
    flags: [],
    fields: { 'company.gazette.failed_searches': ['PLACEHOLDER QUIET'], 'company.gazette.notices': [] },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Psi', 'OFF-PSI', psiDob)], pscs: [individualPsc('Ms Psi Example', psiDob)] }),
    '/officers/OFF-PSI/appointments': list(appointment('ZZ000015', 'PLACEHOLDER QUIET LTD')),
  },
};
