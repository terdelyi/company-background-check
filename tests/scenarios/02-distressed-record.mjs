import { appointment, company, companyRoutes, director, list } from './_helpers.mjs';

const target = company('ZZ000002', 'PLACEHOLDER STRAINED LTD', {
  date_of_creation: '2024-08-01',
  accounts: { overdue: true, next_due: '2026-05-01', last_accounts: {} },
  confirmation_statement: { overdue: true, next_due: '2026-04-15' },
  previous_company_names: [
    { name: 'PLACEHOLDER STRAINED TRADING LTD', effective_from: '2025-06-01', ceased_on: '2025-11-01' },
    { name: 'PLACEHOLDER FIRST NAME LTD', effective_from: '2024-08-01', ceased_on: '2025-06-01' },
  ],
});

export default {
  description: 'Overdue filings, a strike-off notice, renames, director churn, a charge and no PSC each raise their company-level flag',
  args: ['ZZ000002'],
  expect: {
    exit: 0,
    flags: [
      'high accounts_overdue', 'high strike_off_notice', 'medium confirmation_overdue', 'medium renames',
      'medium director_churn', 'low young_company', 'info charges', 'info no_psc',
    ],
    fields: { 'company.resigned_last_12_months': 2, 'company.outstanding_charges': 1 },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [
        director('EXAMPLE, Gamma', 'OFF-GAMMA', { month: 2, year: 1979 }, { appointed_on: '2024-08-01' }),
        director('SAMPLE, Delta', 'OFF-DELTA', { month: 6, year: 1981 }, { appointed_on: '2024-08-01', resigned_on: '2026-01-10' }),
        director('SAMPLE, Epsilon', 'OFF-EPSILON', { month: 8, year: 1984 }, { appointed_on: '2024-08-01', resigned_on: '2025-09-20' }),
      ],
      filings: [{ date: '2026-04-07', type: 'GAZ1', description: 'gazette-notice-compulsory' }],
      charges: list({ status: 'outstanding' }, { status: 'fully-satisfied' }),
    }),
    '/officers/OFF-GAMMA/appointments': list(appointment('ZZ000002', 'PLACEHOLDER STRAINED LTD')),
  },
};
