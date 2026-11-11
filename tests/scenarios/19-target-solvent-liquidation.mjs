import { appointment, company, companyRoutes, director, individualPsc, list } from './_helpers.mjs';

const target = company('ZZ000019', 'PLACEHOLDER WINDDOWN LTD', { company_status: 'liquidation', has_insolvency_history: true });
const gammaDob = { month: 9, year: 1966 };

export default {
  description: 'An employer in members\' voluntary liquidation is still closing (high status) but is not described as insolvent',
  args: ['ZZ000019'],
  expect: {
    exit: 0,
    flags: ['high status'],
    fields: { 'flags.0.text': 'Company status is "liquidation" (members\' voluntary liquidation: a solvent wind-up, the company is still closing)' },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Gamma Two', 'OFF-GAMMA2', gammaDob)],
      pscs: [individualPsc('Mr Gamma Two Example', gammaDob)],
      insolvency: { cases: [{ type: 'members-voluntary-liquidation' }] },
    }),
    '/officers/OFF-GAMMA2/appointments': list(appointment('ZZ000019', 'PLACEHOLDER WINDDOWN LTD', 'liquidation')),
  },
};
