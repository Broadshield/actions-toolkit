import { getOctokitOptions } from '@actions/github/lib/utils';
import type { GitHub } from '@broadshield/github-actions-core-typed-inputs';
import {
  OctokitDefaultOptions,
  core,
  getGithubToken,
  getNumberInput,
  logger,
} from '@broadshield/github-actions-core-typed-inputs';
import type { OctokitOptions } from '@octokit/core/dist-types/types';
import { graphql } from '@octokit/graphql';
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
import { throttling } from '@octokit/plugin-throttling';
import type { ThrottlingOptions } from '@octokit/plugin-throttling/dist-types/types';
import { Octokit as RestOctokit } from '@octokit/rest';

export { validate } from '@octokit/graphql-schema';
export { composePaginateRest, isPaginatingEndpoint } from '@octokit/plugin-paginate-rest';
export type { PaginateInterface, PaginatingEndpoints } from '@octokit/plugin-paginate-rest';
export { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';

// MAX_RETRIES is an arbitrary number, but consider that it limits the number
// of retries for the entire client instance, not for a single request.
export type Unwrap<T> = T extends Promise<infer U> ? U : T;
export type AnyFunction = (...args: any[]) => any;
export type KnownKeys<T> = Extract<
  {
    [K in keyof T]: string extends K ? never : number extends K ? never : K;
  } extends {
    [_ in keyof T]: infer U;
  }
    ? U
    : never,
  keyof T
>;
export type KeysMatching<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];
export type KnownKeysMatching<T, V> = KeysMatching<Pick<T, KnownKeys<T>>, V>;
export type PaginationResults<T = unknown> = T[];
export type GetResultsType<T> = T extends {
  data: any[];
}
  ? T['data']
  : T extends {
      data: object;
    }
  ? T['data'][KnownKeysMatching<T['data'], any[]>]
  : never;
export type NormalizeResponse<T> = T & {
  data: GetResultsType<T>;
};
export type DataType<T> = 'data' extends keyof T ? T['data'] : unknown;
export const MAX_RETRIES = getNumberInput('max_retries', 20);
export const GITHUB_TOKEN = getGithubToken('github_token', process.env['GITHUB_TOKEN']);

export const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `token ${GITHUB_TOKEN}` },
});

type OctokitRequestOptions = {
  method: string;
  url: string;
  request: { retryCount: number };
};

const throttle: ThrottlingOptions = {
  onRateLimit: (retryAfter, options, octokit, retryCount) => {
    const { method, url } = options as OctokitRequestOptions;
    logger.warning(`Request quota exhausted for request ${method} ${url}`);
    // Note: retryCount represents the number of retries for the entire client instance, not for a single request.
    if (retryCount < MAX_RETRIES) {
      octokit.log.info(`Retrying again in ${retryAfter} seconds!`);
      return true;
    }
    return false;
  },
  onSecondaryRateLimit: (_retryAfter, options, _octokit, _retryCount) => {
    const { method, url } = options as OctokitRequestOptions;
    // does not retry, only logs a warning
    logger.warning(`Abuse limit reached for request ${method} ${url}`);
  },
};
const oOptions: OctokitOptions = {
  throttle,
  retry: {
    doNotRetry: ['429', '404'],
  },
};
// Octokit & { paginate: PaginateInterface; } & RestEndpointMethods & Api & { paginate: PaginateInterface; }
const Octokit = RestOctokit.plugin(restEndpointMethods, throttling).defaults({ ...oOptions, ...OctokitDefaultOptions });

export type OctokitType<T> = T extends typeof Octokit
  ? typeof Octokit
  : T extends typeof GitHub
  ? typeof GitHub
  : never;
export type OctokitInstance = InstanceType<typeof Octokit>;
export function createOctokit(token?: string | any, options?: OctokitOptions): OctokitInstance {
  const mergedOptions = getOctokitOptions(token, { ...oOptions, ...options });
  if (mergedOptions.auth) core.setSecret(mergedOptions.auth);
  if (token) core.setSecret(token);
  if (core.isDebug()) logger.debug(`Creating Octokit instance with options: ${JSON.stringify(mergedOptions)}`);

  return new Octokit(mergedOptions);
}

export const gql = String.raw;
