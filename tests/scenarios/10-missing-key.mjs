export default {
  description: 'A missing API key exits 2 before any request',
  args: ['ZZ000001'],
  env: { COMPANIES_HOUSE_API_KEY: '' },
  expect: { exit: 2, stderr: 'COMPANIES_HOUSE_API_KEY not set' },
};
