import { appointment, company, companyRoutes, director, individualPsc, list, tribunalDecision } from './_helpers.mjs';

const target = company('ZZ000016', 'PLACEHOLDER EMPLOYER LTD');
const omegaDob = { month: 8, year: 1971 };

const GPG_HEADER = '"EmployerName","EmployerId","Address","PostCode","CompanyNumber","SicCodes","DiffMeanHourlyPercent","EmployerSize","CurrentName","SubmittedAfterTheDeadline","DueDate","DateSubmitted"';
const gpgRow = (name, id, number, size, late, submitted, address = '1 Example Street, Testtown') =>
  `"${name}","${id}","${address}","ZZ1 1AA","${number}","62012","4.2","${size}","${name}","${late}","2026/04/05 00:00:00","${submitted}"`;
// a neighbour row with a line break and doubled quotes inside quoted fields, as the real file has
const awkwardRow = gpgRow('""QUOTED"" NEIGHBOUR LTD', '99099', 'ZZ900016', '250 to 499', 'False', '2025/03/01 10:00:00', '2 Example Street,\nTesttown');

const SPONSOR_CSV = [
  'Organisation Name,Town/City,County,Type & Rating,Route',
  ' Placeholder Employer Limited,Testtown,,Worker (A rating),Skilled Worker',
  'Placeholder Employer Limited,Testtown,,Worker (A rating),Skilled Worker',
  'Placeholder Employer Holdings Ltd,Othertown,,Worker (A rating),Skilled Worker',
  '"Placeholder, Comma Ltd",Testtown,,Worker (A rating),Skilled Worker',
].join('\r\n');

export default {
  description: 'Gender pay gap filings are found by company number across years, the sponsor register by exact name, and tribunal decisions only where the company is a respondent within six years',
  args: ['ZZ000016'],
  expect: {
    exit: 0,
    flags: ['low tribunal_decisions'],
    fields: {
      'company.gender_pay_gap': {
        filings: [
          { snapshot_year: 2025, employer_size: '500 to 999', submitted_late: true, date_submitted: '2026-04-20', url: 'https://gender-pay-gap.service.gov.uk/employers/99016' },
          { snapshot_year: 2024, employer_size: '250 to 499', submitted_late: false, date_submitted: '2025-03-30', url: 'https://gender-pay-gap.service.gov.uk/employers/99016' },
        ],
        failed_years: [2026],
      },
      'company.sponsor_register.listed': true,
      'company.sponsor_register.matches': [{ name: 'Placeholder Employer Limited', town: 'Testtown', type_rating: 'Worker (A rating)', route: 'Skilled Worker' }],
      'company.tribunal_decisions.search_failed': false,
      'company.tribunal_decisions.decisions.length': 2,
      'company.tribunal_decisions.decisions.0.decision_date': '2025-09-01',
      'company.tribunal_decisions.decisions.0.categories': ['unlawful-deduction-from-wages'],
      'company.tribunal_decisions.decisions.1.title': 'Ms D Claimant v (1) Placeholder Employer Ltd (2) Mr E Manager: 9900004/2024',
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Omega', 'OFF-OMEGA', omegaDob)], pscs: [individualPsc('Mr Omega Example', omegaDob)] }),
    '/officers/OFF-OMEGA/appointments': list(appointment('ZZ000016', 'PLACEHOLDER EMPLOYER LTD')),
    '/viewing/download-data/2025': { csv: [GPG_HEADER, awkwardRow, gpgRow('PLACEHOLDER EMPLOYER LTD', '99016', 'ZZ000016', '500 to 999', 'True', '2026/04/20 09:00:00')].join('\n') },
    '/viewing/download-data/2024': { csv: [GPG_HEADER, gpgRow('PLACEHOLDER EMPLOYER LTD', '99016', 'ZZ000016', '250 to 499', 'False', '2025/03/30 09:00:00'), awkwardRow].join('\n') },
    '/viewing/download-data/2023': { csv: [GPG_HEADER, awkwardRow].join('\n') },
    '/api/content/government/publications/register-of-licensed-sponsors-workers': {
      details: { attachments: [{ title: 'Register of Worker and Temporary Worker licensed sponsors', content_type: 'text/csv', url: '/media/zz/sponsor-register.csv' }] },
    },
    '/media/zz/sponsor-register.csv': { csv: SPONSOR_CSV },
    '/api/search.json?q="PLACEHOLDER EMPLOYER"': {
      total: 4,
      results: [
        tribunalDecision('Mr A Claimant v Placeholder Employer Ltd: 9900001/2025', '2025-09-01', ['unlawful-deduction-from-wages']),
        tribunalDecision('Ms B Claimant v Placeholder Employer Holdings Ltd: 9900002/2025', '2025-07-01', ['unfair-dismissal']),
        tribunalDecision('Mr C Claimant v Placeholder Employer Ltd: 9900003/2018', '2018-05-01', ['breach-of-contract']),
        tribunalDecision('Ms D Claimant v (1) Placeholder Employer Ltd (2) Mr E Manager: 9900004/2024', '2024-02-10', ['unfair-dismissal']),
      ],
    },
  },
};
