import { Octokit as RestOctokit } from '@octokit/rest';

import { octokit } from './github-actions-octokit-hydrated';

describe('octokit.ts', () => {
  it('should be an instance of Octokit', () => {
    expect(octokit).toBeDefined();
    expect(octokit).toBeInstanceOf(RestOctokit);
  });
});
