import * as mitigations from '../src/methods-mitigations';

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
