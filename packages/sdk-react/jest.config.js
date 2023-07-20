const isCI = require('is-ci');

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
const config = {
  reporters: ['default', 'jest-teamcity'],
  testEnvironment: 'jsdom',
  testRegex: ['./*.spec.tsx?$'],
  transform: {
    '^.+\\.tsx?$': ['@swc/jest'],
  },
  collectCoverage: true,
  coverageReporters: ['html'],
};

if (isCI) {
  config.maxWorkers = 7;
}

module.exports = config;
