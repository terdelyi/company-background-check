import { appointment, company, companyRoutes, director, list, office } from './_helpers.mjs';

const target = company('ZZ000021', 'PLACEHOLDER NEWCO LTD', { date_of_creation: '2025-01-10', registered_office_address: office('ZZ2 1AA') });

export default {
  description: 'An old company fails when its insolvency starts, not when it is dissolved years later, and a director who left over a year before the failure is not linked to it',
  args: ['ZZ000021'],
  expect: {
    exit: 0,
    flags: ['medium director_insolvencies', 'low young_company', 'info no_psc'],
    fields: {
      'flags.0.text': 'EXAMPLE, Omega Two: director of 1 other company with insolvency history (EXAMPLE FOUNDRY LTD)',
      'directors.0.failed_companies.length': 2,
      'directors.0.failed_companies.0': {
        name: 'EXAMPLE FOUNDRY LTD', number: 'ZZ100021', status: 'dissolved', insolvent_from: '2016-03-01', ceased: '2024-06-01',
        director_resigned_on: null, director_left_before_failure: false, director_joined_after_failure: false, signals: ['insolvency'], phoenix: null, solvent_liquidation: false,
        url: 'https://find-and-update.company-information.service.gov.uk/company/ZZ100021', tribunal_decisions: [],
      },
      'directors.0.failed_companies.1.insolvent_from': '2023-06-01',
      'directors.0.failed_companies.1.director_left_before_failure': true,
      'directors.0.failed_companies.1.signals': ['insolvency', 'same SIC code', 'target incorporated within 36 months of its insolvency'],
      'directors.0.failed_companies.1.phoenix': null,
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Omega Two', 'OFF-OMEGA21', { month: 3, year: 1965 }, { appointed_on: '2025-01-10' })] }),
    '/officers/OFF-OMEGA21/appointments': list(
      appointment('ZZ000021', 'PLACEHOLDER NEWCO LTD'),
      appointment('ZZ100021', 'EXAMPLE FOUNDRY LTD', 'dissolved'),
      appointment('ZZ100022', 'SAMPLE LOGISTICS LTD', 'dissolved', { resigned_on: '2019-01-01' }),
    ),
    // dissolved within 36 months of the target's start, but wound up eight years before it
    ...companyRoutes(company('ZZ100021', 'EXAMPLE FOUNDRY LTD', {
      company_status: 'dissolved', has_insolvency_history: true, date_of_cessation: '2024-06-01', sic_codes: ['24100'], registered_office_address: office('ZZ8 1AA'),
    }), { insolvency: { cases: [{ type: 'compulsory-liquidation', dates: [
      { date: '2024-06-01', type: 'dissolved-on' }, { date: '2016-03-01', type: 'petitioned-on' }, { date: '2016-05-01', type: 'wound-up-on' },
    ] }] } }),
    ...companyRoutes(company('ZZ100022', 'SAMPLE LOGISTICS LTD', {
      company_status: 'dissolved', has_insolvency_history: true, date_of_cessation: '2025-06-01', registered_office_address: office('ZZ8 2AA'),
    }), { insolvency: { cases: [{ type: 'creditors-voluntary-liquidation', dates: [{ date: '2023-06-01', type: 'wound-up-on' }] }] } }),
  },
};
