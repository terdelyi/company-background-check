import { appointment, company, companyRoutes, director, list, office, tribunalDecision } from './_helpers.mjs';

const target = company('ZZ000022', 'PLACEHOLDER FRESHSTART LTD', { date_of_creation: '2025-02-01', registered_office_address: office('ZZ2 2AA') });
const insolventCompany = (number, name, woundUp) => companyRoutes(
  company(number, name, { company_status: 'liquidation', has_insolvency_history: true, sic_codes: ['56101'], registered_office_address: office('ZZ8 3AA') }),
  { insolvency: { cases: [{ type: 'creditors-voluntary-liquidation', dates: [{ date: woundUp, type: 'wound-up-on' }] }] } },
);

export default {
  description: 'A director\'s failed company is searched for tribunal decisions naming it as respondent, at any date and however the respondent spaces its name; one the director left long before it failed is not searched',
  args: ['ZZ000022'],
  expect: {
    exit: 0,
    flags: ['medium director_insolvencies', 'low young_company', 'low failed_company_tribunals', 'info no_psc'],
    fields: {
      'flags.2.text': 'EXAMPLE KITCHENS LTD, a failed company of EXAMPLE, Kappa: 3 employment tribunal decisions name it as respondent; read them for unpaid pay',
      'flags.2.url': 'https://www.gov.uk/employment-tribunal-decisions/mr-f-claimant-v-example-kitchens-ltd-9900022-2024',
      'directors.0.failed_companies.0.tribunal_decisions.length': 3,
      'directors.0.failed_companies.0.tribunal_decisions.1.title': 'Mr J Claimant v Examplekitchens Limited (In Liquidation): 9900025/2023',
      'directors.0.failed_companies.0.tribunal_decisions.2': {
        title: 'Ms G Claimant v Example Kitchens Limited: 9900023/2017', decision_date: '2017-11-01', categories: ['redundancy-pay'],
        url: 'https://www.gov.uk/employment-tribunal-decisions/ms-g-claimant-v-example-kitchens-limited-9900023-2017',
      },
      'directors.0.failed_companies.1.director_left_before_failure': true,
      'directors.0.failed_companies.1.tribunal_decisions': undefined,
      'meta.failed_company_tribunals': { searched: ['ZZ100023'], failed_searches: [], not_searched: [] },
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Kappa', 'OFF-KAPPA', { month: 8, year: 1970 }, { appointed_on: '2025-02-01' })] }),
    '/officers/OFF-KAPPA/appointments': list(
      appointment('ZZ000022', 'PLACEHOLDER FRESHSTART LTD'),
      appointment('ZZ100023', 'EXAMPLE KITCHENS LTD', 'liquidation'),
      appointment('ZZ100024', 'SAMPLE CATERING LTD', 'liquidation', { resigned_on: '2018-01-01' }),
    ),
    ...insolventCompany('ZZ100023', 'EXAMPLE KITCHENS LTD', '2015-04-01'),
    ...insolventCompany('ZZ100024', 'SAMPLE CATERING LTD', '2021-04-01'),
    '/api/search.json?q="EXAMPLE KITCHENS"': {
      total: 4,
      results: [
        tribunalDecision('Mr F Claimant v Example Kitchens Ltd: 9900022/2024', '2024-03-01', ['unlawful-deduction-from-wages']),
        tribunalDecision('Mr J Claimant v Examplekitchens Limited (In Liquidation): 9900025/2023', '2023-02-01', ['unlawful-deduction-from-wages']),
        tribunalDecision('Ms G Claimant v Example Kitchens Limited: 9900023/2017', '2017-11-01', ['redundancy-pay']),
        tribunalDecision('Example Kitchens Ltd v Mr H Former Employee: 9900024/2019', '2019-02-01', ['breach-of-contract']),
      ],
    },
  },
};
