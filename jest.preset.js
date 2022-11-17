const nxPreset = require('@nrwl/jest/preset').default;

module.exports = {
  ...nxPreset,
  preset: 'ts-jest',
  setupFiles: ['dotenv/config'],
  reporters: ['default', 'jest-junit', 'github-actions'],
  verbose: true,
};
