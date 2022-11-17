import { URL } from 'node:url';

import * as core from '@actions/core';
import { context } from '@actions/github';
import type { Context } from '@actions/github/lib/context';
import * as GitHubUtils from '@actions/github/lib/internal/utils';
import type { defaults as githubOctokitDefaults } from '@actions/github/lib/utils';
import { createTokenAuth } from '@octokit/auth-token';
import type { Authentication } from '@octokit/auth-token/dist-types/types';
import { request } from '@octokit/request';
import type { OctokitResponse, Route } from '@octokit/types';

export * as core from '@actions/core';
export { context } from '@actions/github';
export type { Context } from '@actions/github/lib/context';
export type { GitHub } from '@actions/github/lib/utils';
export type { OctokitResponse, Route } from '@octokit/types';
export type Optional<T> = T | undefined;
export type OptionalPrimitive = Optional<string | number | boolean>;
export type oString = Optional<string>;
export type oNumber = Optional<number>;
export type oBoolean = Optional<boolean>;

export type StringObjectType<T> = T extends string ? string : T extends undefined ? undefined : never;

export type NumberObjectType<T> = T extends number ? number : T extends undefined ? undefined : never;

export type BooleanObjectType<T> = T extends boolean ? boolean : T extends undefined ? undefined : never;

export type PrimitiveType = string | number | boolean | undefined;

export type PrimitiveObjectType<T> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T extends undefined
  ? undefined
  : never;

interface getConverterInterface {
  <T extends oString>(inputValue: oString, fallbackValue: T, options?: core.InputOptions): PrimitiveObjectType<T>;
  <T extends oNumber>(inputValue: oString, fallbackValue: T, options?: core.InputOptions): PrimitiveObjectType<T>;
  <T extends oBoolean>(inputValue: oString, fallbackValue: T, options?: core.InputOptions): PrimitiveObjectType<T>;
}
const baseUrl = GitHubUtils.getApiBaseUrl();
export const OctokitDefaultOptions: typeof githubOctokitDefaults = {
  baseUrl,
  request: {
      agent: GitHubUtils.getProxyAgent(baseUrl)
  }
};
export const logger = {
  debug: core.debug,
  info: core.info,
  warn: core.warning,
  warning: core.warning,
  error: core.error,
};
export const { isDebug } = core;
export const { setFailed } = core;
export const { setOutput } = core;

export function emptyStringToUndefined(value: oString): oString {
  return value === '' ? undefined : value;
}
export function numberConverter<T extends number>(inputValue?: string, fallbackValue?: T): PrimitiveObjectType<T> {
  if (!inputValue && !fallbackValue) {
    return undefined as PrimitiveObjectType<T>;
  }
  return Number(String(inputValue ?? fallbackValue ?? '').trim()) as PrimitiveObjectType<T>;
}

export function booleanConverter<T extends boolean>(inputValue: oString, fallbackValue: T): PrimitiveObjectType<T> {
  const trueList = ['true', '1', 'yes'];
  const falseList = ['false', '0', 'no'];
  if (!inputValue && !fallbackValue) {
    return undefined as PrimitiveObjectType<T>;
  }
  const tidyValue = String(inputValue ?? fallbackValue ?? '')
    .trim()
    .toLowerCase();
  if (trueList.includes(tidyValue)) {
    return true as PrimitiveObjectType<T>;
  }
  if (falseList.includes(tidyValue)) {
    return false as PrimitiveObjectType<T>;
  }
  return undefined as PrimitiveObjectType<T>;
}

export function stringConverter<T extends oString>(inputValue: oString, fallbackValue: T): PrimitiveObjectType<T> {
  const val = inputValue ?? fallbackValue;
  if (val === undefined) {
    return undefined as PrimitiveObjectType<T>;
  }
  return String(val) as PrimitiveObjectType<T>;
}

export function getTypedInput<T extends oString>(
  name: string,
  outputConversionFunction: typeof stringConverter,
  fallbackValue?: T,
  options?: core.InputOptions,
): PrimitiveObjectType<T>;
export function getTypedInput<T extends oBoolean>(
  name: string,
  outputConversionFunction: typeof booleanConverter,
  fallbackValue?: T,
  options?: core.InputOptions,
): PrimitiveObjectType<T>;
export function getTypedInput<T extends oNumber>(
  name: string,
  outputConversionFunction: typeof numberConverter,
  fallbackValue?: T,
  options?: core.InputOptions,
): PrimitiveObjectType<T>;
export function getTypedInput(
  name: string,
  outputConversionFunction: getConverterInterface,
  fallbackValue?: any,
  options?: core.InputOptions,
): PrimitiveType {
  function trimIfRequired(value?: string, trimWhitespace?: boolean): oString {
    if (value) {
      return trimWhitespace ? value.trim() : value;
    }
    return undefined;
  }
  const inputKey = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  const value = inputKey in process.env ? trimIfRequired(process.env[inputKey], options?.trimWhitespace) : undefined;

  return outputConversionFunction(value, fallbackValue, options);
}

export function getNumberInput(
  inputKey: string,
  fallbackValue?: number,
  options?: core.InputOptions,
): PrimitiveObjectType<number> {
  return getTypedInput(inputKey, numberConverter, fallbackValue, options);
}

export function getStringInput(
  inputKey: string,
  fallbackValue?: string,
  options?: core.InputOptions,
): PrimitiveObjectType<string> {
  return getTypedInput(inputKey, stringConverter, fallbackValue, options);
}

export function getBooleanInput(
  inputKey: string,
  fallbackValue?: boolean,
  options?: core.InputOptions,
): PrimitiveObjectType<boolean> {
  return getTypedInput(inputKey, booleanConverter, fallbackValue, options);
}

export function getGithubToken<T extends oString>(
  github_token_key_name = 'github_token',
  fallbackValue: T = process.env['GITHUB_TOKEN'] as T,
  required = true,
): StringObjectType<T> {
  const githubToken = {
    token: getStringInput(github_token_key_name, fallbackValue, { trimWhitespace: true }),
  };
  if (!githubToken.token) {
    if (required) {
      const tokenIsRequired = `${github_token_key_name} is required`;
      setFailed(tokenIsRequired);
      throw new Error(`${github_token_key_name} is required`);
    } else {
      logger.warn(`${github_token_key_name} is not set`);
      return undefined as StringObjectType<T>;
    }
  }
  return githubToken.token as StringObjectType<T>;
}
export function failedValidation(message: string): never {
  setFailed(message);
  throw new Error(message);
}

export async function verifyToken(tokenProvided?: string, tokenIsRequired = true): Promise<Optional<Authentication>> {
  const tokenFailedValidationMessage = (): void =>
    failedValidation(
      `GITHUB_TOKEN is ${tokenProvided ? 'provided but it' : 'not provided and so it'} failed validation.`,
    );
  if (!tokenProvided) {
    logger.error('verifyToken called but GITHUB_TOKEN was not provided');
    if (tokenIsRequired) {
      tokenFailedValidationMessage();
    }
    return undefined;
  }
  try {
    const auth = createTokenAuth(tokenProvided);

    const authentication = await auth();

    logger.debug(`Token verified to be token type: ${authentication.tokenType}`);
    return authentication;
  } catch (error) {
    logger.error(`Token failed validation: ${(error as Error).message}`);
    if (tokenIsRequired) {
      tokenFailedValidationMessage();
    }
    return undefined;
  }
}

export async function getAuthenticatedRepositoryUrl(
  repositoryUrl: string,
  providedToken: string,
  throw_on_failure = true,
): Promise<string> {
  const auth = await verifyToken(providedToken, true);
  if (auth) {
    const { token, tokenType } = auth;
    const tokenWithPrefix = tokenType === 'installation' ? `x-access-token:${token}` : token;
    const repositoryUrlWithToken = repositoryUrl.replace(/\/\/(.*):(.*)@/, `//${tokenWithPrefix}@`);
    const url = new URL(repositoryUrlWithToken);
    return url.toString();
  }
  if (throw_on_failure) {
    throw new Error('getAuthenticatedRepositoryUrl failed to authenticate');
  } else {
    return repositoryUrl;
  }
}

export async function testAuthorizations(tokenProvided: string): Promise<OctokitResponse<any, number>> {
  const auth = createTokenAuth(tokenProvided);
  const route: Route = 'GET /authorizations';
  return auth.hook(request, route);
}

export type GithubOctokitRepo = {
  owner: string;
  repo: string;
};
export type GithubOctokitRepoType<T> = T extends GithubOctokitRepo ? GithubOctokitRepo : T extends undefined ? void : never;
export function repoSplit<T extends GithubOctokitRepo>(inputRepo?: string, yourContext?: Context): GithubOctokitRepoType<T> {
  const ctx = yourContext ?? context;
  if (inputRepo) {
    const [owner, repo] = inputRepo.split('/');
    return { owner, repo } as GithubOctokitRepoType<T>;
  }
  if (process.env['GITHUB_REPOSITORY']) {
    const [owner, repo] = process.env['GITHUB_REPOSITORY'].split('/');
    return { owner, repo } as GithubOctokitRepoType<T>;
  }

  if (ctx.payload.repository) {
    return {
      owner: ctx.payload.repository.owner.login,
      repo: ctx.payload.repository.name,
    } as GithubOctokitRepoType<T>;
  }

  setFailed(`context.repo requires a GITHUB_REPOSITORY environment variable like 'owner/repo'`);
  return undefined as GithubOctokitRepoType<T>;
}
