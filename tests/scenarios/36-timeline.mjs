import { accountsFiling, company, companyRoutes, list } from './_helpers.mjs';

// The name is an existing fictional fixture; all register identifiers are invented.
const number = 'ZZ000036';
const target = company(number, 'SUNNY BADGER SOFTWARE LTD', {
  accounts: { next_accounts: { overdue: true, due_on: '2026-05-10' }, last_accounts: { period_end_on: '2025-12-31', type: 'small' } },
  confirmation_statement: { overdue: true, next_due: '2026-05-20' },
});
const site = `https://find-and-update.company-information.service.gov.uk/company/${number}`;
const filing = (type, id, date, description_values = {}) => ({ type, transaction_id: id, date, description_values });
const pdf = id => `${site}/filing-history/${id}/document?format=pdf&download=0`;

export default {
  description: 'Timeline starts after the latest accounts year end, merges charge filings, orders dated and undated events and retains evidence links',
  args: [number],
  expect: { exit: 0, fields: {
    'company.accounts.last_made_up_to': '2025-12-31',
    'company.accounts.overdue': true,
    'company.accounts.next_due': '2026-05-10',
    'flags.0.code': 'accounts_overdue',
    'company.timeline.accounts_year_end': '2025-12-31',
    'company.timeline.events.length': 11,
    'company.timeline.events.0.kind': 'director_appointed',
    'company.timeline.events.0.effective_date': '2026-01-05',
    'company.timeline.events.0.filed_date': '2026-01-08',
    'company.timeline.events.0.url': pdf('AP01-34'),
    'company.timeline.events.1.kind': 'charge_created',
    'company.timeline.events.1.effective_date': '2026-02-01',
    'company.timeline.events.1.filed_date': '2026-02-04',
    'company.timeline.events.1.document_url': pdf('MR01-34A'),
    'company.timeline.events.2.kind': 'charge_satisfied',
    'company.timeline.events.2.summary': 'Charge satisfied in part',
    'company.timeline.events.2.effective_date': '2026-02-15',
    'company.timeline.events.3.kind': 'charge_created',
    'company.timeline.events.3.effective_date': '2026-03-01',
    'company.timeline.events.3.document_url': null,
    'company.timeline.events.4.kind': 'psc_changed',
    'company.timeline.events.4.effective_date': '2026-03-10',
    'company.timeline.events.5.kind': 'share_allotment',
    'company.timeline.events.5.effective_date': '2026-03-10',
    'company.timeline.events.6.kind': 'charge_satisfied',
    'company.timeline.events.6.summary': 'Charge satisfied in full',
    'company.timeline.events.6.effective_date': '2026-03-20',
    'company.timeline.events.6.filed_date': '2026-03-21',
    'company.timeline.events.6.url': pdf('MR04-34-FULL'),
    'company.timeline.events.6.register_url': `${site}/charges/charge-c`,
    'company.timeline.events.7.kind': 'director_terminated',
    'company.timeline.events.7.effective_date': null,
    'company.timeline.events.7.filed_date': '2026-04-03',
    'company.timeline.events.8.kind': 'accounts_overdue',
    'company.timeline.events.8.due_date': '2026-05-10',
    'company.timeline.events.8.url': site,
    'company.timeline.events.9.kind': 'confirmation_overdue',
    'company.timeline.events.9.due_date': '2026-05-20',
    'company.timeline.events.10.kind': 'psc_ceased',
    'company.timeline.events.10.effective_date': null,
    'company.timeline.events.10.filed_date': null,
  } },
  routes: companyRoutes(target, {
    filings: [
      accountsFiling('ACCT-34', '2025-12-31', '2026-05-25'),
      accountsFiling('ACCT-OLD-34', '2024-12-31', '2025-09-01'),
      filing('AP01', 'AP01-OLD', '2026-02-02', { appointment_date: '2025-12-20', officer_name: 'EXAMPLE, Alpha' }),
      filing('AP01', 'AP01-34', '2026-01-08', { appointment_date: '2026-01-05', officer_name: 'EXAMPLE, Alpha' }),
      { ...filing('AP01', 'AP01-REMOVED', '2026-01-12', { appointment_date: '2026-01-10', officer_name: 'EXAMPLE, Alpha' }), annotations: [{ description: 'annotation', annotation: 'This document has been removed from the register under section 1094' }] },
      { ...filing('AP01', 'AP01-RECTIFIED', '2026-01-15', { appointment_date: '2026-01-13', officer_name: 'EXAMPLE, Alpha' }), annotations: [{ description: 'annotation', annotation: 'This document has been rectified under section 1096' }] },
      filing('MR01', 'MR01-34A', '2026-02-04', { charge_number: 'ZZ0000360001', charge_creation_date: '2026-02-01' }),
      filing('RP04', 'RP04-34', '2026-02-05', { charge_code: 'ZZ0000360001' }),
      { ...filing('MR04', 'MR04-34', '2026-02-17', { charge_number: 'ZZ0000360003', mortgage_satisfaction_date: '2026-02-15' }), description: 'mortgage-satisfy-charge-part' },
      { ...filing('MR04', 'MR04-34-FULL', '2026-03-21', { charge_number: 'ZZ0000360003' }), description: 'mortgage-satisfy-charge-full' },
      filing('PSC04', 'PSC04-34', '2026-03-11', { change_date: '2026-03-10', psc_name: 'Mr Alpha Example' }),
      filing('SH01', 'SH01-34', '2026-03-12', { date: '2026-03-10' }),
      filing('TM01', 'TM01-34', '2026-04-03', { officer_name: 'EXAMPLE, Alpha' }),
      filing('PSC07', 'PSC07-34', null, { psc_name: 'Mr Alpha Example' }),
    ],
    charges: list(
      { charge_code: 'ZZ0000360001', status: 'outstanding', created_on: '2026-02-01', delivered_on: '2026-02-04', persons_entitled: [{ name: 'Example Lender' }], links: { self: `/company/${number}/charges/charge-a` }, transactions: [{ filing_type: 'MR01', delivered_on: '2026-02-04', links: { filing: `/company/${number}/filing-history/MR01-34A` } }] },
      { charge_code: 'ZZ0000360002', status: 'outstanding', created_on: '2026-03-01', delivered_on: '2026-03-04', links: { self: `/company/${number}/charges/charge-b` } },
      { charge_code: 'ZZ0000360003', status: 'fully-satisfied', created_on: '2024-01-01', satisfied_on: '2026-03-20', links: { self: `/company/${number}/charges/charge-c` }, transactions: [{ filing_type: 'satisfy-charge-part', delivered_on: '2026-02-17', links: { filing: `/company/${number}/filing-history/MR04-34` } }, { filing_type: 'satisfy-charge-full', delivered_on: '2026-03-21', links: { filing: `/company/${number}/filing-history/MR04-34-FULL` } }] },
    ),
  }),
};
