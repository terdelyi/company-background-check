import { accountsFiling, appointment, company, companyRoutes, director, individualPsc, ixbrl, ixbrlDocument, list, office, tribunalDecision } from './_helpers.mjs';

const target = company('ZZ000029', 'PLACEHOLDER TEAPOT BOX LTD', { date_of_creation: '2024-06-01', registered_office_address: office('ZZ29 1AA') });
const psiDob = { month: 3, year: 1975 };
const accounts = ixbrlDocument('DOC-ZZ29-2025', ixbrl([{ end: '2025-03-31', facts: { NetAssetsLiabilities: '50,000', AverageNumberEmployeesDuringPeriod: '12' } }]));

export default {
  description: 'A failed company whose registered name runs some of its words together is also searched with them spaced out, even when a brand word could swallow the split, a Document API hiccup is retried, and a related company that is still active is listed apart from the closed chain',
  // "Teapotbox" as a brand would leave "teapotbox" whole if only the fewest words were tried
  args: ['ZZ000029', '--aka', 'Teapotbox'],
  expect: {
    exit: 0,
    flags: ['high phoenix_strong', 'high company_cycling', 'low young_company', 'low failed_company_tribunals'],
    fields: {
      'company.accounts.history.0.format': 'ixbrl',
      'company.accounts.history.0.net_assets': 50000,
      'directors.0.failed_companies.0.tribunal_decisions.length': 1,
      'directors.0.failed_companies.0.tribunal_decisions.0.title': 'Mx K Claimant v Placeholder Teapot Box Ltd (in Liquidation): 9900029/2023',
      'flags.1.text': 'EXAMPLE, Psi: 2 closed companies in the last 10 years with a similar name or the same registered postcode - PLACEHOLDER TEAPOTBOX LTD (2020-insolvent), PLACEHOLDER TEAPOT SUPPLIES LTD (2021-2024). Still active with a similar name or the same postcode: PLACEHOLDER TEAPOT CAFE LTD (from 2025)',
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Psi', 'OFF-PSI29', psiDob, { appointed_on: '2024-06-01' })],
      pscs: [individualPsc('Mr Psi Example', psiDob)],
      filings: [accountsFiling('DOC-ZZ29-2025', '2025-03-31', '2025-10-01')],
    }),
    ...accounts,
    '/document/DOC-ZZ29-2025': { failFirst: 1, then: accounts['/document/DOC-ZZ29-2025'] },
    '/officers/OFF-PSI29/appointments': list(
      appointment('ZZ000029', 'PLACEHOLDER TEAPOT BOX LTD'),
      appointment('ZZ100291', 'PLACEHOLDER TEAPOTBOX LTD', 'liquidation'),
      appointment('ZZ100292', 'PLACEHOLDER TEAPOT SUPPLIES LTD', 'dissolved'),
      appointment('ZZ100293', 'PLACEHOLDER TEAPOT CAFE LTD'),
    ),
    ...companyRoutes(company('ZZ100291', 'PLACEHOLDER TEAPOTBOX LTD', {
      company_status: 'liquidation', has_insolvency_history: true, date_of_creation: '2020-01-01', registered_office_address: office('ZZ29 1AA'),
    }), { insolvency: { cases: [{ type: 'creditors-voluntary-liquidation', dates: [{ date: '2023-03-01', type: 'wound-up-on' }] }] } }),
    '/company/ZZ100292': company('ZZ100292', 'PLACEHOLDER TEAPOT SUPPLIES LTD', {
      company_status: 'dissolved', date_of_creation: '2021-01-01', date_of_cessation: '2024-01-01', registered_office_address: office('ZZ29 1AA'),
    }),
    '/company/ZZ100293': company('ZZ100293', 'PLACEHOLDER TEAPOT CAFE LTD', { date_of_creation: '2025-01-01', registered_office_address: office('ZZ29 1AA') }),
    '/api/search.json?q="placeholder teapot box"': {
      total: 1,
      results: [tribunalDecision('Mx K Claimant v Placeholder Teapot Box Ltd (in Liquidation): 9900029/2023', '2023-06-01', ['unlawful-deduction-from-wages'])],
    },
  },
};
