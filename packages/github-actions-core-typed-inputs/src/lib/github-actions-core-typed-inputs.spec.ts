import { build, perBuild, sequence } from '@jackfranklin/test-data-bot';
import { expect } from '@jest/globals';

import * as myGithub from './github-actions-core-typed-inputs';

const udfnd = 'undefined';
const inputBuilder = build('Input', {
  fields: {
    id: sequence(),
    stringInput: perBuild(() => ({
        converter: myGithub.stringConverter,
        returnType: 'string',
        keyAction: `string_`,
        keyEnv: `INPUT_STRING_`,
        value: `string number `,
      })
    ),
    numberInput: perBuild(() => ({
        converter: myGithub.numberConverter,
        returnType: 'number',
        keyAction: `number_`,
        keyEnv: `INPUT_NUMBER_`,
        value: 0,
      })
    ),
    booleanInput: perBuild(() => ({
        converter: myGithub.booleanConverter,
        returnType: 'boolean',
        keyAction: `boolean_`,
        keyEnv: `INPUT_BOOLEAN_`,
        value: true,
      }
    )),
  },
  postBuild: (input: any) => {
    const { id } = input;
    const ita = [input.stringInput, input.numberInput, input.booleanInput];

    for (const iType of ita) {
      const { keyAction, keyEnv, returnType } = iType;
      iType.keyAction = `${keyAction}${id}`;
      iType.keyEnv = `${keyEnv}${id}`;
      if (returnType === 'string') {
        iType.value = `${iType.value}${id}`;
      } else if (returnType === 'number') {
        iType.value = Number(id);
      }
    }
    return input;
  },
});

describe('github.ts', () => {
  const { env } = process;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
  });
  afterEach(() => {
    process.env = env;
  });
  describe('Test getTypedInput', () => {
    it('should return a string from the input', () => {
      const input = inputBuilder().stringInput;
      const { converter, returnType, value, keyEnv, keyAction } = input;
      process.env[keyEnv] = value;
      const result = myGithub.getTypedInput(keyAction, converter);
      expect(typeof result).toBe(returnType);
      expect(result).toBe(value);
      delete process.env[keyEnv];
    });

    it('should return undefined value from the input', () => {
      const input = inputBuilder().stringInput;
      const { converter, keyAction, keyEnv } = input;
      const returnType = udfnd;
      const value = undefined;
      process.env[keyEnv] = value;
      const result = myGithub.getTypedInput(keyAction, converter);
      expect(typeof result).toBe(returnType);
      expect(result).toBe(value);
      delete process.env[keyEnv];
    });
  });

  describe.each`
    inputBuilderFunction                 | inputFunction               | inputFunctionName    | inputType
    ${() => inputBuilder().stringInput}  | ${myGithub.getStringInput}  | ${'getStringInput'}  | ${'string'}
    ${() => inputBuilder().numberInput}  | ${myGithub.getNumberInput}  | ${'getNumberInput'}  | ${'number'}
    ${() => inputBuilder().booleanInput} | ${myGithub.getBooleanInput} | ${'getBooleanInput'} | ${'boolean'}
  `(
    'Check each input function for correct return values and types',
    ({ inputBuilderFunction, inputFunction, inputFunctionName, inputType }) => {
      describe(`Testing ${inputFunctionName}`, () => {
        it(`should return a ${inputType} from the provided input key's value`, () => {
          const input = inputBuilderFunction();
          const { returnType, value, keyEnv, keyAction } = input;
          process.env[keyEnv] = value;
          const result = inputFunction(keyAction);
          expect(typeof result).toBe(returnType);
          expect(result).toBe(value);
          delete process.env[keyEnv];
        });

        it(`should return ${udfnd} type and value from the provided input key's value is not set`, () => {
          const input = inputBuilderFunction();
          const { keyAction, keyEnv } = input;
          const returnType = udfnd;
          const value = undefined;

          process.env[keyEnv] = value;
          const result = inputFunction(keyAction);
          expect(typeof result).toBe(returnType);
          expect(result).toBe(value);
          delete process.env[keyEnv];
        });

        it(`should return a ${inputType} when input value is undefined and a fallback value is provided`, () => {
          const input = inputBuilderFunction();
          const { returnType, keyAction, keyEnv, value: fallback } = input;
          const value = undefined;

          expect(fallback).toBe(input.value);
          expect(typeof fallback).toBe(typeof input.value);
          process.env[keyEnv] = value;
          const result = inputFunction(keyAction, fallback);
          expect(typeof result).toBe(returnType);
          expect(result).toBe(fallback);
          delete process.env[keyEnv];
        });
      });
    },
  );
  describe('Test utilities', () => {
    it('should return an object with an `owner` key and a `repo` key from the GITHUB_REPOSITORY environment variable', () => {
      expect(process.env['GITHUB_REPOSITORY']).toBeDefined();
      const result = myGithub.repoSplit();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('owner');
      expect(result).toHaveProperty('repo');
    });
  });

  describe('Test GitHub Authentication', () => {
    beforeEach(() => {
      jest.resetModules();

      process.env = {
        ...env,
        REAL_GITHUB_TOKEN: process.env['GITHUB_TOKEN'] || '',
        GITHUB_TOKEN: 'ghp_1234567890',
      };
    });
    afterEach(() => {
      process.env = env;
    });

    it('should return a string with a token from the input', () => {
      process.env['INPUT_TOKEN'] = process.env['GITHUB_TOKEN'] || '';
      const result = myGithub.getGithubToken('token');
      expect(typeof result).toBe('string');
      expect(result).toBe(process.env['GITHUB_TOKEN']);
      delete process.env['INPUT_TOKEN'];
    });
    it('should return a string from the default input `github_token`', () => {
      process.env['INPUT_GITHUB_TOKEN'] = process.env['GITHUB_TOKEN'] || '';
      const result = myGithub.getGithubToken('token');
      expect(typeof result).toBe('string');
      expect(result).toBe(process.env['GITHUB_TOKEN']);
      delete process.env['INPUT_GITHUB_TOKEN'];
    });
    it('should return a string from the environment variable `GITHUB_TOKEN`', () => {
      const result = myGithub.getGithubToken();
      expect(typeof result).toBe('string');
      expect(result).toBe(process.env['GITHUB_TOKEN']);
    });

    it('should be a GitHub formatted token', () => {
      const input = inputBuilder().stringInput;
      const { converter, keyAction, keyEnv } = input;
      const returnType = udfnd;
      const value = undefined;
      process.env[keyEnv] = value;
      const result = myGithub.getTypedInput(keyAction, converter);
      expect(typeof result).toBe(returnType);
      expect(result).toBe(value);
      delete process.env[keyEnv];
    });
  });
});
