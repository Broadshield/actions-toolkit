import type { GithubOctokitRepo } from '@broadshield/github-actions-core-typed-inputs';
import { logger } from '@broadshield/github-actions-core-typed-inputs';
import {
  createOctokit,
  KnownKeysMatching,
  OctokitInstance,
  PaginatingEndpoints,
} from '@broadshield/github-actions-octokit-hydrated';

export function basename(path: string): string {
  if (!path) return '';
  return path.split('/').reverse()[0] ?? '';
}

type releasesRouteType = 'GET /repos/{owner}/{repo}/releases';
const releasesRoute: releasesRouteType = 'GET /repos/{owner}/{repo}/releases';

type tagsRouteType = 'GET /repos/{owner}/{repo}/tags';
const tagsRoute: tagsRouteType = 'GET /repos/{owner}/{repo}/tags';

type workflowsRouteType = 'GET /repos/{owner}/{repo}/actions/workflows';
const workflowsRoute: workflowsRouteType = 'GET /repos/{owner}/{repo}/actions/workflows';

type workflowRunsRouteType = 'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs';
const workflowRunsRoute: workflowRunsRouteType = 'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs';

type UsablePaginatingEndpoints = Pick<
  PaginatingEndpoints,
  releasesRouteType | tagsRouteType | workflowsRouteType | workflowRunsRouteType
>;

type DataType<T> = 'data' extends keyof T ? T['data'] : never;
type UsablePaginatingEndpointType<T> = T extends keyof UsablePaginatingEndpoints ? UsablePaginatingEndpoints[T] : never;

type UsableEndpointResponseDataType<T extends keyof UsablePaginatingEndpoints> = DataType<
  UsablePaginatingEndpoints[T]['response']
>;

type ReturnListType<T extends keyof UsablePaginatingEndpoints> = T extends tagsRouteType ? string : number;
type FilterableParameters<T extends keyof UsablePaginatingEndpoints> = T extends UsableEndpointResponseDataType<T> ? KnownKeysMatching<
  UsableEndpointResponseDataType<T>,
  string | number
  > : never;
type FilterableParameterValueTypes = RegExp | Date | number | string;
type FilterInterface<R extends keyof UsablePaginatingEndpoints> = {
  [key in keyof FilterableParameters<R>]: FilterableParameterValueTypes;
};
interface AvailableRouteOptions {
  returnKey: string;
  lookupKey: string;
}
type AvailableRoutes = {
  [key in keyof UsablePaginatingEndpoints]: AvailableRouteOptions;
} & {
  [releasesRoute]: AvailableRouteOptions;
  [tagsRoute]: AvailableRouteOptions;
  [workflowsRoute]: AvailableRouteOptions;
  [workflowRunsRoute]: AvailableRouteOptions;
};
const availableRoutes: AvailableRoutes = {
  [releasesRoute]: {
    returnKey: 'id',
    lookupKey: 'release_id',
  },
  [tagsRoute]: {
    returnKey: 'ref',
    lookupKey: 'ref',
  },
  [workflowsRoute]: {
    returnKey: 'id',
    lookupKey: 'workflow_id',
  },
  [workflowRunsRoute]: {
    returnKey: 'id',
    lookupKey: 'run_id',
  },
};

function isKeyOfResponseData<T extends keyof UsablePaginatingEndpoints>(
  arg: unknown,
  responseData: object,
): arg is keyof FilterableParameters<T> {
  return (
    typeof arg === 'string' &&
    Object.keys(responseData).includes(arg) &&
    typeof (responseData as UsableEndpointResponseDataType<T>)[arg as keyof UsableEndpointResponseDataType<T>] in
      ['string', 'number']
  );
}

function parametersToString<R extends keyof UsablePaginatingEndpoints>(
  parameters?: UsablePaginatingEndpoints[R]['parameters'],
): string {
  if (!parameters) return '';
  return Object.entries(parameters)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function itemFilterToString<R extends keyof UsablePaginatingEndpoints>(filter?: FilterInterface<R>): string {
  if (filter) {
    const keys = Object.keys(filter) as (keyof typeof filter)[];
    const outputStringArray: string[] = [];
    for (const key of keys) {
      if (isKeyOfResponseData(key, filter)) {
        const value = filter[key];
        let valueString = '';
        if (value instanceof RegExp) {
          valueString = `RegEx of ${value.toString()}`;
        } else if (value instanceof Date) {
          valueString = value.toISOString();
        } else if (typeof value === 'string') {
          valueString = value;
        } else if (typeof value === 'number') {
          valueString = Number(value).toString(10);
        }
        if (valueString) {
          outputStringArray.push(`[${String(key)}: ${valueString}]`);
        }
      }
    }
    if (outputStringArray.length > 0) {
      return outputStringArray.join(', ');
    }
  }
  return 'undefined';
}
function repoToString(repo: GithubOctokitRepo): string {
  return `${repo.owner}/${repo.repo}`;
}
function assertOctokit(octokit: OctokitInstance | undefined): asserts octokit is OctokitInstance {
  if (!octokit) {
    throw new Error('Octokit instance not set');
  }
}
export interface KondoOptions {
  octokit?: OctokitInstance;
  repo: GithubOctokitRepo;
  github_token?: string;
}
export class Kondo {
  octokit?: OctokitInstance;

  repo: GithubOctokitRepo;

  constructor(options: KondoOptions) {
    this.repo = options.repo;
    if (options.github_token && !options.octokit) {
      this.octokit = createOctokit(options.github_token, options.octokit);
    } else if (options.octokit) {
      this.octokit = options.octokit;
    }
  }

  setOctokit(octokit: OctokitInstance): void {
    this.octokit = octokit;
  }

  getOctokit(): OctokitInstance | undefined {
    return this.octokit;
  }


  async getMatchingItemsFromEndpointRest<T extends keyof UsablePaginatingEndpoints>(
    endpoint: T,
    parameters?: UsablePaginatingEndpointType<T>['parameters'],
    filter?: FilterInterface<T>,
    octokit: OctokitInstance | undefined = this.octokit,
  ): Promise<ReturnListType<T>[]> {
    assertOctokit(octokit);
    const filtered_return_keys: ReturnListType<T>[] = [];
    logger.debug(
      `getMatchingItemsFromEndpointRest: endpoint: ${endpoint}, parameters: ${parametersToString(
        parameters,
      )}, filter: ${itemFilterToString(filter)}`,
    );
    for await (const response of octokit.paginate.iterator(endpoint, parameters)) {
      // ResponseType<T>["data"]
      if (response?.data && Array.isArray(response.data)) {


        const items = response.data;

        for (const item of items) {
          type Item = typeof item;
          const rKey = availableRoutes[endpoint].returnKey as keyof Item;
          if (item[rKey] !== undefined) {

          const itemReturnKey: ReturnListType<T> = item[rKey] as ReturnListType<T>;

          if (!filter) {
            filtered_return_keys.push(itemReturnKey);
          } else {
            const filterKeys = Object.keys(filter) as (keyof typeof filter)[];

            for (const filterKey of filterKeys) {
              if (filterKey && isKeyOfResponseData(filterKey, item)) {
                const filterValue = filter[filterKey];
                if (filterValue instanceof RegExp) {
                  if (filterValue.test(item[filterKey])) {
                    filtered_return_keys.push(itemReturnKey);
                  }
                } else if (filterValue instanceof Date) {
                  if (filterValue.getTime() === new Date(item[filterKey]).getTime()) {
                    filtered_return_keys.push(itemReturnKey);
                  }
                } else if (typeof filterValue === 'string' || typeof filterValue === 'number') {
                  if (filterValue === item[filterKey]) {
                    filtered_return_keys.push(itemReturnKey);
                  }
                } else {
                  logger.warn(`Unknown filter value type: ${filterValue} as ${typeof filterValue}`);
                }
              } else {
                logger.warn(`Unknown filter key: ${String(filterKey)} as ${typeof filterKey}`);
              }
            }
          }
        }
        }
      }
    }
    logger.info(`Found ${filtered_return_keys.length} ids matching filter: ${itemFilterToString(filter)}`);
    return filtered_return_keys;
  }

  async getFilteredReleaseIdsFromRepo(
    parameters?: UsablePaginatingEndpoints[releasesRouteType]['parameters'],
    filter?: FilterInterface<releasesRouteType>,
    repo: GithubOctokitRepo = this.repo,
  ): Promise<ReturnListType<releasesRouteType>[]> {
    return this.getMatchingItemsFromEndpointRest(
      releasesRoute,
      { ...repo, ...parameters } as UsablePaginatingEndpoints[releasesRouteType]['parameters'],
      filter,
    );
  }

  async getFilteredTagRefsFromRepo(
    parameters?: UsablePaginatingEndpoints[tagsRouteType]['parameters'],
    filter?: FilterInterface<tagsRouteType>,
    repo: GithubOctokitRepo = this.repo,
  ): Promise<ReturnListType<tagsRouteType>[]> {
    return this.getMatchingItemsFromEndpointRest(
      tagsRoute,
      { ...repo, ...parameters } as UsablePaginatingEndpoints[tagsRouteType]['parameters'],
      filter,
    );
  }

  async getFilteredWorkflowIdsFromRepo(
    parameters?: UsablePaginatingEndpoints[workflowsRouteType]['parameters'],
    filter?: FilterInterface<workflowsRouteType>,
    repo: GithubOctokitRepo = this.repo,
  ): Promise<ReturnListType<workflowsRouteType>[]> {
    return this.getMatchingItemsFromEndpointRest(
      workflowsRoute,
      { ...repo, ...parameters } as UsablePaginatingEndpoints[workflowsRouteType]['parameters'],
      filter,
    );
  }

  async getFilteredWorkflowRunIdsFromRepo(
    parameters?: UsablePaginatingEndpoints[workflowRunsRouteType]['parameters'],
    filter?: FilterInterface<workflowRunsRouteType>,
    repo: GithubOctokitRepo = this.repo,
  ): Promise<ReturnListType<workflowRunsRouteType>[]> {
    return this.getMatchingItemsFromEndpointRest(
      workflowRunsRoute,
      { ...repo, ...parameters } as UsablePaginatingEndpoints[workflowRunsRouteType]['parameters'],
      filter,
    );
  }

  async deleteReleasesByIds(
    release_ids: number[],
    repo: GithubOctokitRepo = this.repo,
    octokit: OctokitInstance | undefined = this.octokit,
  ): Promise<void[]> {
    assertOctokit(octokit);
    return Promise.all(
      release_ids.map(async (release_id) =>
        octokit.rest.repos.deleteRelease({ ...repo, release_id }).then(
          (value) =>
            logger.debug(
              `Successfully deleted release ${release_id} in repo ${repoToString(repo)}. status: ${value.status}`,
            ),
          (error) => {
            logger.error(`Error deleting release ${release_id} in repo ${repoToString(repo)}`);
            if (error instanceof Error || typeof error === 'string') {
              logger.error(error);
            } else {
              logger.error(JSON.stringify(error));
            }
          },
        ),
      ),
    );
  }

  async deleteTagsByRefs(
    refs: string[],
    repo: GithubOctokitRepo = this.repo,
    octokit: OctokitInstance | undefined = this.octokit,
  ): Promise<void[]> {
    assertOctokit(octokit);
    return Promise.all(
      refs.map(async (ref) =>
        octokit.rest.git.deleteRef({ ...repo, ref }).then(
          (value) =>
            logger.debug(`Successfully deleted tag ${ref} in repo ${repoToString(repo)}. status: ${value.status}`),
          (error) => {
            logger.error(`Error deleting tag ${ref} in repo ${repoToString(repo)}`);
            if (error instanceof Error || typeof error === 'string') {
              logger.error(error);
            } else {
              logger.error(JSON.stringify(error));
            }
          },
        ),
      ),
    );
  }

  /**
   *
   * @param {number[]} run_ids List of workflow run ids to cancel
   * @param {GithubOctokitRepo} repo Object containing repository's owner and repo keys, defaults to this.repo
   * @param {OctokitInstance} octokit Octokit instance to use, defaults to this.octokit
   * @returns {Promise<void[]>} Array of promises that resolve to void
   */
  async deleteWorkflowRunsByIds(
    run_ids: number[],
    repo: GithubOctokitRepo = this.repo,
    octokit: OctokitInstance | undefined = this.octokit,
  ): Promise<void[]> {
    assertOctokit(octokit);
    return Promise.all(
      run_ids.map(async (run_id) =>
        octokit.rest.actions.deleteWorkflowRun({ ...repo, run_id }).then(
          (value) =>
            logger.debug(
              `Successfully deleted workflow run ${run_id} in repo ${repoToString(repo)}. status: ${value.status}`,
            ),
          (error) => {
            logger.error(`Error deleting workflow run ${run_id} in repo ${repoToString(repo)}`);
            if (error instanceof Error || typeof error === 'string') {
              logger.error(error);
            } else {
              logger.error(JSON.stringify(error));
            }
          },
        ),
      ),
    );
  }
}
