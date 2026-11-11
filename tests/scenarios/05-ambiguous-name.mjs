const candidate = (number, title) => ({
  company_number: number, title, company_status: 'active', date_of_creation: '2018-01-01', address_snippet: '1 Example Street, Testtown, ZZ1 1AA',
});

export default {
  description: 'A name with several matches and no exact one exits 3 with the candidates',
  args: ['Placeholder Common'],
  expect: { exit: 3, fields: { ambiguous: true, 'candidates.length': 3, 'candidates.0.number': 'ZZ000051' } },
  routes: {
    '/search/companies?q=Placeholder Common': {
      items: [
        candidate('ZZ000051', 'PLACEHOLDER COMMON NORTH LTD'),
        candidate('ZZ000052', 'PLACEHOLDER COMMON SOUTH LTD'),
        candidate('ZZ000053', 'PLACEHOLDER COMMON EAST LTD'),
      ],
    },
  },
};
