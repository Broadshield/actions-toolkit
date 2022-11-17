import { basename } from './github-actions-workflow-marie-kondo';

describe('basename()', () => {
  const pathstring = '/path/to/file.txt';
  it('returns the last part of a string which is seperated by forward slashes', () => {
    expect(basename(pathstring)).toEqual('file.txt');
  });
  it('returns the the same string back if no slashes', () => {
    expect(basename('file.txt')).toEqual('file.txt');
  });
});
