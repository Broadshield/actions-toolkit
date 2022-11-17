import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import type { Config } from 'jest';

const currentDir = basename(__dirname);
// Reading the SWC compilation config and remove the "exclude"
// for the test files to be compiled by SWC
/* eslint-disable @typescript-eslint/no-unused-vars */
const { exclude: _, ...swcJestConfig } = JSON.parse(readFileSync(`${__dirname}/.lib.swcrc`, 'utf8'));
const config: Config = {
  displayName: currentDir,
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: `../../coverage/packages/${currentDir}`,
};
export default config;
