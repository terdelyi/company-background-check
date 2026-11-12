import { appointment, company, companyRoutes, corporatePsc, director, gazetteSearch, list } from './_helpers.mjs';

const target = company('ZZ000017', 'PLACEHOLDER SUBSIDIARY LTD');
const midco = company('ZZ000171', 'PLACEHOLDER MIDCO LTD', { accounts: { overdue: true, next_due: '2026-01-31', last_accounts: {} } });
const topco = company('ZZ000172', 'PLACEHOLDER TOPCO PLC', { company_status: 'liquidation', has_insolvency_history: true, type: 'plc' });
const ultimate = company('ZZ000173', 'PLACEHOLDER ULTIMATE LTD');

export default {
  description: 'Corporate owners are followed up to three levels with company-level and Gazette checks; a foreign owner, a ceased owner and a fourth level are not followed',
  args: ['ZZ000017'],
  expect: {
    exit: 0,
    flags: ['high parent_accounts_overdue', 'high parent_status', 'high parent_insolvency', 'high parent_winding_up_petition'],
    fields: {
      'flags.0.record': 'parent',
      'company.ir35_size.part_of_group': true,
      'flags.0.text': 'Parent PLACEHOLDER MIDCO LTD: Accounts overdue (were due 2026-01-31)',
      'company.parents.length': 3,
      'company.parents.0': {
        level: 1, name: 'PLACEHOLDER MIDCO LTD', number: 'ZZ000171', status: 'active', owner_of: 'PLACEHOLDER SUBSIDIARY LTD',
        control: ['ownership-of-shares-75-to-100-percent'], flags: ['accounts_overdue'], gazette_name_only: [],
        url: 'https://find-and-update.company-information.service.gov.uk/company/ZZ000171',
      },
      'company.parents.1.flags': ['status', 'insolvency', 'winding_up_petition'],
      'company.parents.1.owner_of': 'PLACEHOLDER MIDCO LTD',
      'company.parents.2.level': 3,
      'meta.parents_not_followed': [
        { name: 'Placeholder Overseas BV', owner_of: 'PLACEHOLDER MIDCO LTD', reason: 'registered in Netherlands' },
        { name: 'Placeholder Beyond Limited', owner_of: 'PLACEHOLDER ULTIMATE LTD', reason: 'more than 3 levels up' },
      ],
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Alpha Two', 'OFF-ALPHA2', { month: 5, year: 1980 })],
      pscs: [
        corporatePsc('Placeholder Midco Limited', 'ZZ000171', 'England'),
        corporatePsc('Placeholder Former Owner Limited', 'ZZ000179', 'England', { ceased_on: '2020-01-01' }),
      ],
    }),
    '/officers/OFF-ALPHA2/appointments': list(appointment('ZZ000017', 'PLACEHOLDER SUBSIDIARY LTD')),
    ...companyRoutes(midco, {
      pscs: [corporatePsc('Placeholder Topco Plc', 'ZZ000172', 'England and Wales'), corporatePsc('Placeholder Overseas BV', 'NL12345678', 'Netherlands')],
    }),
    ...companyRoutes(topco, {
      pscs: [corporatePsc('Placeholder Ultimate Limited', 'ZZ000173', 'United Kingdom')],
      insolvency: { cases: [{ type: 'creditors-voluntary-liquidation' }] },
    }),
    ...gazetteSearch('PLACEHOLDER TOPCO', [
      { id: '9000171', code: '2450', category: 'Petitions to Wind Up (Companies)', published: '2026-03-02', title: 'PLACEHOLDER TOPCO PLC', number: 'ZZ000172' },
    ]),
    // the ultimate parent also holds a stake in the midco, a loop that must not be followed twice
    ...companyRoutes(ultimate, { pscs: [corporatePsc('Placeholder Midco Limited', 'ZZ000171', 'England'), corporatePsc('Placeholder Beyond Limited', 'ZZ000174', 'England')] }),
  },
};
