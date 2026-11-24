import { company, companyRoutes, list } from './_helpers.mjs';

const number = 'ZZ000038';
const target = company(number, 'SUNNY BADGER SOFTWARE LTD');
const site = `https://find-and-update.company-information.service.gov.uk/company/${number}`;
const charge = id => ({
  type: 'MR01', transaction_id: id, date: '2026-02-04',
  description: 'mortgage-create',
  description_values: { charge_number: 'ZZ0000380001', charge_creation_date: '2026-02-01' },
});
const oldCharge = 'ZZ0000380003';
const statusOnlyCharge = 'ZZ0000380004';
const unlinkedCharge = 'ZZ0000380005';
const fullSatisfaction = (charge_number, transaction_id, date, mortgage_satisfaction_date) => ({
  type: 'MR04', transaction_id, date, description: 'mortgage-satisfy-charge-full',
  description_values: { charge_number, mortgage_satisfaction_date },
});
const appointment = (id, date) => ({
  type: 'AP01', transaction_id: id, date, description: 'appoint-person-director-company-with-name-date',
  description_values: { appointment_date: '2025-12-04', officer_name: 'EXAMPLE, Alpha' },
});
const transaction = (filing_type, id, delivered_on) => ({
  filing_type, delivered_on, links: { filing: `/company/${number}/filing-history/${id}` },
});

export default {
  description: 'Filing-only and register-only charges retain their sources, and duplicate filings do not add events',
  args: [number],
  expect: { exit: 0, fields: {
    'company.timeline.accounts_year_end': '2025-03-31',
    'company.timeline.events.length': 8,
    'company.timeline.events.0.kind': 'director_appointed',
    'company.timeline.events.0.filed_date': '2025-12-05',
    'company.timeline.events.1.kind': 'charge_created',
    'company.timeline.events.1.effective_date': '2026-02-01',
    'company.timeline.events.1.filed_date': '2026-02-04',
    'company.timeline.events.1.charge_code': 'ZZ0000380001',
    'company.timeline.events.1.document_url': `${site}/filing-history/MR01-36A/document?format=pdf&download=0`,
    'company.timeline.events.2.document_url': `${site}/filing-history/MR01-36C/document?format=pdf&download=0`,
    'company.timeline.events.3.kind': 'charge_satisfied',
    'company.timeline.events.3.effective_date': null,
    'company.timeline.events.3.filed_date': '2026-04-01',
    'company.timeline.events.4.kind': 'charge_satisfied',
    'company.timeline.events.4.charge_code': oldCharge,
    'company.timeline.events.4.effective_date': '2026-04-05',
    'company.timeline.events.4.filed_date': null,
    'company.timeline.events.5.charge_code': statusOnlyCharge,
    'company.timeline.events.5.summary': 'Charge satisfied in full',
    'company.timeline.events.5.filed_date': '2026-04-10',
    'company.timeline.events.6.charge_code': unlinkedCharge,
    'company.timeline.events.6.summary': 'Charge satisfied in full',
    'company.timeline.events.6.url': `${site}/filing-history/MR04-36E/document?format=pdf&download=0`,
    'company.timeline.events.6.effective_date': '2026-04-17',
    'company.timeline.events.6.filed_date': '2026-04-18',
    'company.timeline.events.7.charge_code': unlinkedCharge,
    'company.timeline.events.7.summary': 'Charge satisfaction recorded in part',
    'company.timeline.events.7.effective_date': null,
    'company.timeline.events.7.filed_date': '2026-04-18',
  } },
  routes: companyRoutes(target, {
    filings: [
      charge('MR01-36A'), charge('MR01-36B'),
      appointment('AP01-36B', '2025-12-07'), appointment('AP01-36A', '2025-12-05'),
      {
        type: 'MR04', transaction_id: 'MR04-36-OLD', date: '2025-03-05',
        description: 'mortgage-satisfy-charge-part-with-date',
        description_values: { charge_number: oldCharge, mortgage_satisfaction_date: '2025-02-28' },
      },
      fullSatisfaction(statusOnlyCharge, 'MR04-36D', '2026-04-10', '2026-04-09'),
      fullSatisfaction(unlinkedCharge, 'MR04-36E', '2026-04-18'),
      fullSatisfaction(unlinkedCharge, 'MR04-36E', '2026-04-18'),
    ],
    charges: list(
      {
        charge_code: 'ZZ0000380002', created_on: '2026-03-01', status: 'fully-satisfied',
        transactions: [
          transaction('create-charge-with-deed', 'MR01-36C', '2026-03-04'),
          transaction('satisfy-charge-full', 'MR04-36C', '2026-04-01'),
        ],
      },
      {
        charge_code: oldCharge, created_on: '2024-01-01', status: 'fully-satisfied', satisfied_on: '2026-04-05',
        transactions: [transaction('satisfy-charge-part', 'MR04-36-OLD', '2025-03-05')],
      },
      { charge_code: statusOnlyCharge, created_on: '2024-01-01', status: 'fully-satisfied' },
      {
        charge_code: unlinkedCharge, created_on: '2024-01-01', status: 'fully-satisfied', satisfied_on: '2026-04-17',
        transactions: ['satisfy-charge-full', 'satisfy-charge-part'].map(filing_type => ({ filing_type, delivered_on: '2026-04-18' })),
      },
    ),
  }),
};
