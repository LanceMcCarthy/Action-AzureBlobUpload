import * as core from '@actions/core';
import * as path from 'path';

// Mitigation for side effect from fixing 122
// This function finds any erroneous duplicate names in path and removes it
// e.g. this input 'D:/a/Action-AzureBlobUpload/Action-AzureBlobUpload/src/TestData/ExcelFileTestRoot/Test.xlsx'
// is returned as 'D:/a/Action-AzureBlobUpload/src/TestData/ExcelFileTestRoot/Test.xlsx'
export function checkForFirstDuplicateInPath(filePath: string): string {
  const norm = path.normalize(filePath);

  // break the path up into segments
  const pathSegments = norm.split(path.sep);

  let duplicateDetected = false;
  let lastSegment = '';

  pathSegments.forEach(segment => {
    if (segment !== '' && lastSegment === segment) {
      duplicateDetected = true;

      // If we found a duplicate, splice out the duplicated folder name
      const index = pathSegments.indexOf(segment);
      pathSegments.splice(index, 1);

      core.info(`"WARNING - Duplicate folder name found in path. Removing the extra '${segment}"' value and recombining path.`);
    }

    lastSegment = segment;
  });

  const fixedPath = pathSegments.join('/');

  if (duplicateDetected) {
    core.info(`"FinalPathForFileName after 'double-folder name' mitigation: ${fixedPath}"`);
  }

  return fixedPath;
}

// This function finds any erroneous multiple duplicate names in path and removes them
// e.g. this input 'D:/a/Action-AzureBlobUpload/Action-AzureBlobUpload/src/TestData/TestData/ExcelFileTestRoot/Test.xlsx'
// is returned as 'D:/a/Action-AzureBlobUpload/src/TestData/ExcelFileTestRoot/Test.xlsx'
export function checkForMultipleDuplicatesInPath(filePath: string): string {
  const norm = path.normalize(filePath);

  // break the path up into segments
  const pathSegments = norm.split(path.sep);

  let lastSegment = '';
  let duplicateDetected = false;
  const consecutiveDuplicates: string[] = [];

  // Find the erroneous duplicate folder names
  pathSegments.forEach(segment => {
    if (segment !== '' && lastSegment === segment) {
      duplicateDetected = true;

      consecutiveDuplicates.push(segment);

      core.info(`"WARNING - Duplicate folder name found in path. Removing the extra '${segment}"' value and recombining path.`);
    }
    lastSegment = segment;
  });

  // remove the duplicate segements
  if (consecutiveDuplicates.length > 0) {
    consecutiveDuplicates.forEach(duplicate => {
      const index = pathSegments.indexOf(duplicate);
      pathSegments.splice(index, 1);
    });
  }

  const fixedPath = pathSegments.join('/');

  if (duplicateDetected) {
    core.info(`"FinalPathForFileName after 'double-folder name' mitigation: ${fixedPath}"`);
  }

  return fixedPath;
}
