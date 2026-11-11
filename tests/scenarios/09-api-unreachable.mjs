export default {
  description: 'An unreachable API exits 2 so the skill falls back to the public pages',
  args: ['ZZ000009'],
  base: 'http://127.0.0.1:9',
  expect: { exit: 2, stderr: 'API unreachable' },
};
