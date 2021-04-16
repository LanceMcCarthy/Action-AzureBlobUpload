import {getFinalPathForFileName} from '../src/methods-helpers';

describe('getFinalPathForFileName', () => {
  it('Should return just the filename if no destination is given', () => {
    expect(getFinalPathForFileName('./test.txt')).toEqual('test.txt');
    expect(getFinalPathForFileName('./build/bin/test.exe')).toEqual('test.exe');
  });
  it('Should correctly join destination folder with file name', () => {
    expect(getFinalPathForFileName('./test.txt', 'artifacts/output')).toEqual('artifacts/output/test.txt');
    expect(getFinalPathForFileName('./build/bin/test.exe', 'artifacts/output')).toEqual('artifacts/output/test.exe');
    expect(getFinalPathForFileName('./test.txt', 'artifacts\\output\\')).toEqual('artifacts/output/test.txt');
    expect(getFinalPathForFileName('test', 'out')).toEqual('out/test');
  });
});
