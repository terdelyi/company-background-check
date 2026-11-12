import { accountsFiling, appointment, company, companyRoutes, director, individualPsc, ixbrl, ixbrlDocument, list } from './_helpers.mjs';

const target = company('ZZ000027', 'PLACEHOLDER BEACON LTD');
const phiDob = { month: 4, year: 1976 };
const extension = (date, newDate) => ({
  category: 'accounts', type: 'AA01', date, description: 'change-account-reference-date-company-current-extended', description_values: { made_up_date: '2024-12-31', new_date: newDate },
});

export default {
  description: 'Two year-end extensions, a new charge, payroll cover and staff in a company that owes more than it owns each show up with dates, lenders and figures',
  args: ['ZZ000027'],
  expect: {
    exit: 0,
    flags: ['medium negative_net_assets', 'medium year_end_extended', 'low recent_charge', 'low employer_without_assets', 'info charges'],
    fields: {
      'company.accounts.history.0.net_current_assets': -40000,
      'company.accounts.history.0.staff_costs': 600000,
      'company.accounts.history.0.payroll_months_in_cash': 1.5,
      'company.ir35_size.status': 'probably small',
      'company.ir35_size.basis': 'filed micro-entity accounts',
      'company.charges': [{ created_on: '2026-01-15', lenders: ['Example Capital Partners Ltd'], type: 'A registered charge' }],
      'flags.0.text': 'Financial year extended 2 times in the last 5 years (2025-09-01 to a year end of 2025-06-30 and 2023-03-01 to a year end of 2023-06-30), which delays the next accounts',
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Phi', 'OFF-PHI27', phiDob)],
      pscs: [individualPsc('Mr Phi Example', phiDob)],
      filings: [accountsFiling('DOC-ZZ27-2025', '2025-06-30', '2026-03-01'), extension('2025-09-01', '2025-06-30'), extension('2023-03-01', '2023-06-30')],
      charges: list({ status: 'outstanding', created_on: '2026-01-15', persons_entitled: [{ name: 'Example Capital Partners Ltd' }], classification: { description: 'A registered charge' } }),
    }),
    '/officers/OFF-PHI27/appointments': list(appointment('ZZ000027', 'PLACEHOLDER BEACON LTD')),
    ...ixbrlDocument('DOC-ZZ27-2025', ixbrl([
      { end: '2025-06-30', facts: {
        NetAssetsLiabilities: { v: '12,000', sign: '-' }, NetCurrentAssetsLiabilities: { v: '40,000', sign: '-' }, CashBankOnHand: '75,000',
        StaffCostsEmployeeBenefitsExpense: '600,000', AverageNumberEmployeesDuringPeriod: '22',
      } },
    ])),
  },
};
