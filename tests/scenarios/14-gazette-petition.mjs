import { appointment, company, companyRoutes, director, gazetteSearch, individualPsc, list } from './_helpers.mjs';

const target = company('ZZ000014', 'PLACEHOLDER PETITION LTD', {
  previous_company_names: [{ name: 'PLACEHOLDER OLDNAME LTD', effective_from: '2015-03-01', ceased_on: '2022-06-01' }],
});
const chiDob = { month: 7, year: 1976 };
const own = { title: 'PLACEHOLDER PETITION LTD', number: 'ZZ000014' };

export default {
  description: 'A recent petition carrying the company number is high, older and other insolvency notices are medium, a namesake\'s notice is name-only, notices over 5 years old are ignored, and previous names are searched too',
  args: ['ZZ000014'],
  expect: {
    exit: 0,
    flags: ['high winding_up_petition', 'medium gazette_insolvency', 'medium gazette_insolvency'],
    fields: {
      'company.gazette.searched_names': ['PLACEHOLDER PETITION', 'PLACEHOLDER OLDNAME'],
      'company.gazette.failed_searches': [],
      'company.gazette.notices.length': 3,
      'company.gazette.notices.0': {
        title: 'PLACEHOLDER PETITION LTD', notice_code: '2450', category: 'Petitions to Wind Up (Companies)', published: '2026-05-10', url: 'https://www.thegazette.co.uk/notice/9000001',
      },
      'meta.gazette_name_only': [{
        title: 'PLACEHOLDER PETITION (NORTH) LTD', notice_code: '2450', category: 'Petitions to Wind Up (Companies)', published: '2026-04-01', url: 'https://www.thegazette.co.uk/notice/9000002',
      }],
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Chi', 'OFF-CHI', chiDob)], pscs: [individualPsc('Mr Chi Example', chiDob)] }),
    '/officers/OFF-CHI/appointments': list(appointment('ZZ000014', 'PLACEHOLDER PETITION LTD')),
    ...gazetteSearch('PLACEHOLDER PETITION', [
      { id: '9000001', code: '2450', category: 'Petitions to Wind Up (Companies)', published: '2026-05-10', ...own },
      { id: '9000002', code: '2450', category: 'Petitions to Wind Up (Companies)', published: '2026-04-01', title: 'PLACEHOLDER PETITION (NORTH) LTD', number: 'ZZ900002' },
      { id: '9000004', code: '2450', category: 'Petitions to Wind Up (Companies)', published: '2023-12-01', ...own },
      { id: '9000005', code: '2432', category: 'Appointment of Liquidators', published: '2019-01-15', ...own },
      // another company's notice that only mentions this one in its text, not a namesake
      { id: '9000006', code: '2441', category: 'Resolutions for Winding-up', published: '2025-11-19', title: 'UNRELATED CAR WASH LTD' },
    ]),
    ...gazetteSearch('PLACEHOLDER OLDNAME', [
      { id: '9000003', code: '2410', category: 'Appointment of Administrators', published: '2023-02-01', title: 'PLACEHOLDER OLDNAME LTD', number: 'ZZ000014' },
      { id: '9000001', code: '2450', category: 'Petitions to Wind Up (Companies)', published: '2026-05-10', ...own },
    ]),
  },
};
