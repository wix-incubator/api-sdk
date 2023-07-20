module.exports = {
  env: {
    mocha: true,
    jest: true,
    jasmine: true,
    protractor: true,
  },
  globals: {
    browser: false,
    page: false,
    debugBrowser: false,
  },
  plugins: ['jest'],
  overrides: [
    {
      files: [
        '**/*.spec.[tj]s?(x)',
        '**/*.test.[tj]s?(x)',
        '**/*.e2e.[tj]s?(x)',
        '**/*.it.[tj]s?(x)',
      ],
      rules: {
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        // for chai expressions like "expect(...).to.be.undefined"
        // https://github.com/eslint/eslint/issues/2102
        'no-unused-expressions': 0,
      },
    },
  ],
};
