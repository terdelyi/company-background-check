import { company, companyRoutes, list } from './_helpers.mjs';

const number = 'ZZ000041';
const target = company(number, 'PLACEHOLDER OPCO LTD');
const chargeCode = 'ZZ0000410001';

export default {
  description: 'An unlinked charge satisfaction filing pairs with a register transaction delivered a day earlier',
  args: [number],
  expect: { exit: 0, fields: {
    'company.timeline.events.length': 2,
    'company.timeline.events.0.summary': 'Charge satisfied in part',
    'company.timeline.events.1.kind': 'charge_satisfied',
    'company.timeline.events.1.summary': 'Charge satisfied in full',
    'company.timeline.events.1.effective_date': '2026-04-16',
    'company.timeline.events.1.filed_date': '2026-04-18',
  } },
  routes: companyRoutes(target, {
    filings: [
      {
        type: 'MR04', transaction_id: 'MR04-41P', date: '2026-03-02', description: 'mortgage-satisfy-charge-part',
        description_values: { charge_number: chargeCode, mortgage_satisfaction_date: '2026-03-01' },
      },
      {
        type: 'MR04', transaction_id: 'MR04-41', date: '2026-04-18', description: 'mortgage-satisfy-charge-full',
        description_values: { charge_number: chargeCode },
      },
    ],
    charges: list({
      charge_code: chargeCode, created_on: '2024-01-01', status: 'fully-satisfied', satisfied_on: '2026-04-16',
      transactions: [
        { filing_type: 'satisfy-charge-part', delivered_on: '2026-03-02', links: { filing: `/company/${number}/filing-history/MR04-41P` } },
        { filing_type: 'satisfy-charge-full', delivered_on: '2026-04-17' },
      ],
    }),
  }),
};
