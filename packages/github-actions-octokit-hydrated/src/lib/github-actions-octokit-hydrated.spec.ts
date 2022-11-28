import { Octokit as RestOctokit } from '@octokit/rest';

import { createOctokit } from './github-actions-octokit-hydrated';

describe('octokit.ts', () => {
  it('should be an instance of Octokit', () => {
    expect(process.env['GITHUB_TOKEN']).toBeDefined();
    const octokit = createOctokit(process.env['GITHUB_TOKEN']);
    expect(octokit).toBeDefined();
    expect(octokit).toBeInstanceOf(RestOctokit);
  });
});
