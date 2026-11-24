import { company, companyRoutes, list } from './_helpers.mjs';

const target = company('ZZ000037', 'SUNNY BADGER SOFTWARE LTD', {
  accounts: { overdue: false, next_due: '2026-12-31', last_accounts: { made_up_to: '2025-12-31', type: 'small' } },
});
export default {
  description: 'Timeline with no later material events remains empty',
  args: ['ZZ000037'],
  expect: { exit: 0, fields: { 'company.timeline.accounts_year_end': '2025-12-31', 'company.timeline.events': [], 'company.timeline.limits': [] } },
  routes: companyRoutes(target, { charges: list() }),
};
