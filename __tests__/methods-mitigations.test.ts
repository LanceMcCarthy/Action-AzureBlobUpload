import * as mitigations from '../src/methods-mitigations';
import {expect, describe, it} from '@jest/globals';

describe('getFinalPathForFileName', () => {
  it('Should remove first consecutive duplicate from path', () => {
    const brokenPath = 'D:/a/Action-AzureBlobUpload/Action-AzureBlobUpload/TestFiles/ExcelFiles/Test.xlsx';
    const fixedPath = 'D:/a/Action-AzureBlobUpload/TestFiles/ExcelFiles/Test.xlsx';
    expect(mitigations.checkForFirstDuplicateInPath(brokenPath)).toEqual(fixedPath);
  });

  it('Should remove multiple consecutive duplicates from path', () => {
    const brokenPath = 'D:/a/Action-AzureBlobUpload/Action-AzureBlobUpload/TestFiles/ExcelFiles/ExcelFiles/Test.xlsx';
    const fixedPath = 'D:/a/Action-AzureBlobUpload/TestFiles/ExcelFiles/Test.xlsx';
    expect(mitigations.checkForFirstDuplicateInPath(brokenPath)).toEqual(fixedPath);
  });
});

describe('checkForMultipleDuplicatesInPath', () => {
  it('Should remove every repeated segment from the path', () => {
    const brokenPath = 'D:/a/Action-AzureBlobUpload/Action-AzureBlobUpload/TestFiles/ExcelFiles/ExcelFiles/Test.xlsx';
    const fixedPath = 'D:/a/Action-AzureBlobUpload/TestFiles/ExcelFiles/Test.xlsx';
    expect(mitigations.checkForMultipleDuplicatesInPath(brokenPath)).toEqual(fixedPath);
  });

  it('Should return the original path when no duplicates exist', () => {
    const validPath = 'D:/a/Action-AzureBlobUpload/TestFiles/ExcelFiles/Test.xlsx';
    expect(mitigations.checkForMultipleDuplicatesInPath(validPath)).toEqual(validPath);
  });
});
