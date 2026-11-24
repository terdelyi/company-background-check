import { appointment, company, companyRoutes, corporatePsc, director, individualPsc, list, office } from './_helpers.mjs';

const address = office('ZZ36 1AA');
const target = company('ZZ903600', 'PLACEHOLDER GROUPWORKS PLC', { registered_office_address: address });
const dob = { month: 6, year: 1979 };
const psc = corporatePsc(target.company_name, target.company_number, 'England');
const change = (transaction_id, extra = {}) => ({
  type: 'PSC05',
  transaction_id,
  description_values: { psc_name: target.company_name, change_date: '2021-01-01' },
  ...extra,
});
const closures = [
  ['ZZ903601', 'PLACEHOLDER GROUPWORKS IP LTD', [change('TX-REMOVED', {
    annotations: [{ annotation: 'The document was administratively removed from the public register.' }],
  })]],
  ['ZZ903602', 'PLACEHOLDER GROUPWORKS FINANCE LTD', [change('TX-RECTIFIED', {
    annotations: [{ description: 'legacy', description_values: { description: 'The filing was rectified by the registrar.' } }],
  })]],
  ['ZZ903603', 'PLACEHOLDER GROUPWORKS TRADING LTD', [change('TX-REPLACEMENT', {
    associated_filings: [{ type: 'RP01' }],
  })]],
  ['ZZ903604', 'PLACEHOLDER GROUPWORKS SERVICES LTD', [
    change('TX-ORDINARY', { annotations: [{ annotation: 'Clarification. The registered information was confirmed.' }] }),
    change('TX-OTHER-PSC', {
      type: 'PSC06',
      description_values: { psc_name: 'PLACEHOLDER HARBOUR HOLDINGS LTD', change_date: '2021-01-01' },
      associated_filings: [{ type: 'RP01' }],
    }),
    { type: 'AA', associated_filings: [{ type: 'RP01' }] },
  ]],
];
const affected = closures.slice(0, 3);
const related = 'directors.0.related_companies';

export default {
  description: 'A removed, rectified or replaced control filing keeps its closure in cycling and unrelated corrections leave valid group evidence usable',
  args: [target.company_number],
  expect: {
    exit: 0,
    flags: ['high company_cycling'],
    fields: {
      ...Object.fromEntries(affected.flatMap(([number, , [filing]], i) => [
        [`${related}.${i}.group_member`, false],
        [`${related}.${i}.group_membership_gap.reasons.0`, 'PSC control change filing was removed, rectified or has an unresolved replacement'],
        [`${related}.${i}.group_membership_gap.source_urls.0`, `https://find-and-update.company-information.service.gov.uk/company/${number}/filing-history/${filing.transaction_id}/document`],
      ])),
      [`${related}.3.group_member`]: true,
      'flags.0.text': "EXAMPLE, Chi: 3 closed companies in the last 10 years with a similar name or the same registered postcode - PLACEHOLDER GROUPWORKS IP LTD (2016-2023), PLACEHOLDER GROUPWORKS FINANCE LTD (2016-2023), PLACEHOLDER GROUPWORKS TRADING LTD (2016-2023) (1 closed company in the target's own group left out)",
    },
  },
  routes: {
    ...companyRoutes(target, { officers: [director('EXAMPLE, Chi', 'OFF-CHI-903600', dob)], pscs: [individualPsc('Mr Chi Example', dob)] }),
    '/officers/OFF-CHI-903600/appointments': list(appointment(target.company_number, target.company_name), ...closures.map(([number, name]) => appointment(number, name, 'dissolved'))),
    ...Object.assign({}, ...closures.map(([number, name, filings]) => companyRoutes(company(number, name, {
      company_status: 'dissolved', date_of_creation: '2016-01-01', date_of_cessation: '2023-05-01', registered_office_address: address,
    }), { pscs: [psc], filings }))),
  },
};
