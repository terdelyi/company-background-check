import { appointment, company, companyRoutes, corporatePsc, director, list, office } from './_helpers.mjs';

const target = company('ZZ000020', 'PLACEHOLDER OPCO LTD');
const holdco = company('ZZ000201', 'PLACEHOLDER HOLDCO LTD', { accounts: { overdue: true, next_due: '2026-01-31', last_accounts: {} } });

// Companies House often records a UK corporate owner with only a legal authority, no register or number
const unnumberedPsc = name => ({
  ...corporatePsc(name, undefined, undefined),
  identification: { legal_form: 'Limited Company', legal_authority: 'England & Wales' },
  address: office('ZZ1 1AA'),
});
const candidate = (number, title, postcode) => ({ company_number: number, title, company_status: 'active', address: office(postcode) });

export default {
  description: 'A UK corporate owner with no company number is found by an exact name search, and left alone when the name matches more than one company',
  args: ['ZZ000020'],
  expect: {
    exit: 0,
    flags: ['high parent_accounts_overdue'],
    fields: {
      'company.parents.length': 1,
      'company.parents.0.number': 'ZZ000201',
      'company.parents.0.matched_by': 'name',
      'meta.parents_not_followed': [
        { name: 'Placeholder Twin Limited', owner_of: 'PLACEHOLDER OPCO LTD', reason: 'no company number given, and 2 companies match the name' },
      ],
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Alpha Twenty', 'OFF-ALPHA20', { month: 5, year: 1980 })],
      pscs: [unnumberedPsc('Placeholder Holdco Limited'), unnumberedPsc('Placeholder Twin Limited')],
    }),
    '/officers/OFF-ALPHA20/appointments': list(appointment('ZZ000020', 'PLACEHOLDER OPCO LTD')),
    '/search/companies?q=Placeholder Holdco Limited': {
      items: [candidate('ZZ000202', 'PLACEHOLDER HOLDCO SERVICES LTD', 'ZZ9 9ZZ'), candidate('ZZ000201', 'PLACEHOLDER HOLDCO LTD', 'ZZ1 1AA')],
    },
    '/search/companies?q=Placeholder Twin Limited': {
      items: [candidate('ZZ000203', 'PLACEHOLDER TWIN LTD', 'ZZ8 8ZZ'), candidate('ZZ000204', 'PLACEHOLDER TWIN LIMITED', 'ZZ7 7ZZ')],
    },
    ...companyRoutes(holdco),
  },
};
