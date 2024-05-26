// @ts-check
const antfu = require('@antfu/eslint-config').default

module.exports = antfu(
  {
    ignores: [
      'node_modules',
      'assets',
      'public',
      'README.md',
    ],
  },
  {
    rules: {
      'unused-imports/no-unused-vars': 0,
      'eqeqeq': 0,
      'node/prefer-global/process': 0,
      'ts/ban-ts-comment': 0,
      'unicorn/prefer-node-protocol': 0,
      'no-console': 0,
    },
  },
)
