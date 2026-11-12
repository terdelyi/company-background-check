import { accountsFiling, appointment, company, companyRoutes, director, individualPsc, ixbrl, ixbrlDocument, list, pdfDocument } from './_helpers.mjs';

const target = company('ZZ000013', 'PLACEHOLDER DRAINING LTD');
const phiDob = { month: 2, year: 1983 };

export default {
  description: 'A PDF-only year is filled from the newer filing\'s comparatives, a PDF year links its public download, a missing document is marked unavailable, net assets falling by 70% is flagged, and a tiny headcount is too small to trend',
  args: ['ZZ000013'],
  expect: {
    exit: 0,
    flags: ['medium net_assets_fall'],
    fields: {
      'company.accounts.history.0.net_assets': 30000,
      'company.accounts.history.1': { year_end: '2024-06-30', filed: '2025-03-01', format: 'pdf',
        document: { url: 'https://find-and-update.company-information.service.gov.uk/company/ZZ000013/filing-history/TX-DOC-ZZ13-2024/document?format=pdf&download=0', pages: 12, scanned: true },
        net_assets: 100000, cash: null, employees: 4, turnover: null, net_current_assets: null, profit: null, staff_costs: null, payroll_months_in_cash: null },
      'company.accounts.history.2.format': 'unavailable',
      'company.accounts.history.2.net_assets': null,
      'company.accounts.going_concern_doubt': false,
    },
  },
  routes: {
    ...companyRoutes(target, {
      officers: [director('EXAMPLE, Phi', 'OFF-PHI', phiDob)],
      pscs: [individualPsc('Ms Phi Example', phiDob)],
      filings: [
        accountsFiling('DOC-ZZ13-2025', '2025-06-30', '2026-03-02'),
        accountsFiling('DOC-ZZ13-2024', '2024-06-30', '2025-03-01', { pages: 12, paper_filed: true }),
        accountsFiling('DOC-ZZ13-2023', '2023-06-30', '2024-03-04'),
      ],
    }),
    '/officers/OFF-PHI/appointments': list(appointment('ZZ000013', 'PLACEHOLDER DRAINING LTD')),
    ...ixbrlDocument('DOC-ZZ13-2025', ixbrl([
      { end: '2025-06-30', facts: { NetAssetsLiabilities: '30,000', AverageNumberEmployeesDuringPeriod: '2' } },
      { end: '2024-06-30', facts: { NetAssetsLiabilities: '100,000', AverageNumberEmployeesDuringPeriod: '4' } },
    ])),
    ...pdfDocument('DOC-ZZ13-2024'),
  },
};
