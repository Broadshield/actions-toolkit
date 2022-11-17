const nxPreset = require('@nrwl/jest/preset').default;
/** @type {import('ts-jest').ProjectConfigTsJest} */
module.exports = {
  ...nxPreset,
  testEnvironment: 'node',
  testEnvironmentOptions: {},
  setupFiles: ["<rootDir>/../../tools/scripts/dotenv.jest.js"],
  reporters: ['default', 'jest-junit', 'github-actions'],
  verbose: true,
  "transformIgnorePatterns": [
    "<rootdir>/packages/(.*)/node_modules/(?!(.*\.d\.ts)?)"
   ]
};
