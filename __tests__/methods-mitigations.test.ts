import * as mitigations from '../src/methods-mitigations';

describe('getFinalPathForFileName', () => {
  it('Should remove first consecutive duplicate from path', () => {
    const brokenPath = 'D:/a/Action-AzureBlobUpload/Action-AzureBlobUpload/src/TestData/ExcelFileTestRoot/Test.xlsx';
    const fixedPath = 'D:/a/Action-AzureBlobUpload/src/TestData/ExcelFileTestRoot/Test.xlsx';
    expect(mitigations.checkForFirstDuplicateInPath(brokenPath)).toEqual(fixedPath);
  });

  it('Should remove multiple consecutive duplicates from path', () => {
    const brokenPath = 'D:/a/Action-AzureBlobUpload/Action-AzureBlobUpload/src/TestData/TestData/ExcelFileTestRoot/Test.xlsx';
    const fixedPath = 'D:/a/Action-AzureBlobUpload/src/TestData/ExcelFileTestRoot/Test.xlsx';
    expect(mitigations.checkForFirstDuplicateInPath(brokenPath)).toEqual(fixedPath);
  });
});
