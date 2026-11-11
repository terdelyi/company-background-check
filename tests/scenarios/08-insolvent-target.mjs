import { appointment, company, companyRoutes, director, individualPsc, list } from './_helpers.mjs';

const target = company('ZZ000008', 'PLACEHOLDER SINKING LTD', { company_status: 'liquidation', has_insolvency_history: true });
const sigmaDob = { month: 10, year: 1966 };

export default {
  description: 'A company in liquidation is flagged for its status and its insolvency case',
  args: ['ZZ000008'],
  expect: {
    exit: 0,
    flags: ['high status', 'high insolvency'],
    fields: { 'company.insolvency_cases': ['creditors-voluntary-liquidation'] },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Sigma', 'OFF-SIGMA', sigmaDob)],
      pscs: [individualPsc('Mr Sigma Example', sigmaDob)],
      insolvency: { cases: [{ type: 'creditors-voluntary-liquidation' }] },
    }),
    '/officers/OFF-SIGMA/appointments': list(appointment('ZZ000008', 'PLACEHOLDER SINKING LTD', 'liquidation')),
  },
};
