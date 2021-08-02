import * as helpers from '../src/methods-helpers';
import {expect, describe, it} from '@jest/globals';

describe('getFinalPathForFileName', () => {
  it('Should return just the filename if no destination is given', () => {
    expect(helpers.getFinalPathForFileName('./test.txt')).toEqual('test.txt');
    expect(helpers.getFinalPathForFileName('./build/bin/test.exe')).toEqual('test.exe');
  });

  it('Should correctly join destination folder with file name', () => {
    expect(helpers.getFinalPathForFileName('./test.txt', 'artifacts/output')).toEqual('artifacts/output/test.txt');
    expect(helpers.getFinalPathForFileName('./build/bin/test.exe', 'artifacts/output')).toEqual('artifacts/output/test.exe');
    expect(helpers.getFinalPathForFileName('./test.txt', 'artifacts\\output\\')).toEqual('artifacts/output/test.txt');
    expect(helpers.getFinalPathForFileName('test', 'out')).toEqual('out/test');
  });

  it('Should normalize paths', () => {
    expect(helpers.getFinalPathForFileName('test', '/out')).toEqual('out/test');
    expect(helpers.getFinalPathForFileName('test', '/out/')).toEqual('out/test');
    expect(helpers.getFinalPathForFileName('/test', '/out')).toEqual('out/test');
    expect(helpers.getFinalPathForFileName('/test/', '/out/')).toEqual('out/test');
  });
});

describe('FindFilesFlat', () => {
  it('Should find all file paths in single directory', async () => {
    const files = await helpers.FindFilesFlat('./TestFiles/TxtFiles');
    expect(files.length).toBeGreaterThanOrEqual(2);
  });
});

describe('FindFilesRecursive', () => {
  it('Should find all files in directory and subdirectories', async () => {
    const files = await helpers.FindFilesRecursive('./TestFiles/');
    expect(files.length).toBeGreaterThan(0);
  });
});
