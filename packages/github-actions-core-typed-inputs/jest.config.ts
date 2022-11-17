/* eslint-disable */
import type { Config } from 'jest';
const config: Config = {
  displayName: 'github-actions-core-typed-inputs',
  preset: '../../jest.preset.js',
  globals: {},
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/github-actions-core-typed-inputs',
};
export default config;
