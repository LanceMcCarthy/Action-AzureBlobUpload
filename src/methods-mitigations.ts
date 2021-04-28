import * as core from '@actions/core';
import * as path from 'path';

// Mitigation
// This function finds any erroneous duplicate names in path and removes it
// e.g.
// error input 'D:/a/Action-AzureBlobUpload/Action-AzureBlobUpload/TestFiles/ExcelFiles/Test.xlsx'
// corrected output 'D:/a/Action-AzureBlobUpload/TestFiles/ExcelFiles/Test.xlsx'
export function checkForFirstDuplicateInPath(filePath: string): string {
  const norm = path.normalize(filePath);

  // break the path up into segments
  const pathSegments = norm.split(path.sep);

  let lastSegment = '';

  pathSegments.forEach(segment => {
    // If the last segment and the next segment are the same, we found a consequitive duplicate
    if (segment !== '' && lastSegment === segment) {
      core.info(`"START - DUPLICATE PATH AUTO-FIX`);
      core.info(
        `"A consecutive duplicate folder name has been detected in the file path. This can happen when the fetch-depth is too low, which results in an invalid file path. An automatic fix is being implemented now...`
      );

      // If we found a duplicate, splice out the duplicated folder name
      const index = pathSegments.indexOf(segment);
      pathSegments.splice(index, 1);

      core.info(`"- Removed duplicate segment '${segment}"'...`);

      core.info(`"The file path(s) have been successfully repaired.`);
      core.info(`"END - DUPLICATE PATH AUTO-FIX`);
    }

    lastSegment = segment;
  });

  const fixedPath = pathSegments.join('/');

  return fixedPath;
}

// Mitigation
// This function finds any erroneous duplicate names in path and removes them
// e.g.
// error input 'D:/a/Action-AzureBlobUpload/Action-AzureBlobUpload/TestFiles/ExcelFiles/ExcelFiles/Test.xlsx'
// corrected output 'D:/a/Action-AzureBlobUpload/TestFiles/ExcelFiles/Test.xlsx'
export function checkForMultipleDuplicatesInPath(filePath: string): string {
  const norm = path.normalize(filePath);

  // break the path up into segments
  const pathSegments = norm.split(path.sep);

  let lastSegment = '';
  const consecutiveDuplicates: string[] = [];

  // Find the erroneous duplicate folder names
  pathSegments.forEach(segment => {
    // If the last segment and the next segment are the same, we found a consequitive duplicate
    if (segment !== '' && lastSegment === segment) {
      // Add the duplciate segemnt to the list of segments to remove
      consecutiveDuplicates.push(segment);

      core.info(`"START - DUPLICATE PATH AUTO-FIX`);
      core.info(
        `"A consecutive duplicate folder name has been detected in the file path. This can happen when the fetch-depth is too low, which results in an invalid file path. An automatic fix is being implemented now...`
      );
    }
    lastSegment = segment;
  });

  // Remove the duplicate segements
  if (consecutiveDuplicates.length > 0) {
    consecutiveDuplicates.forEach(duplicateSegment => {
      const index = pathSegments.indexOf(duplicateSegment);
      pathSegments.splice(index, 1);

      core.info(`"- Removed duplicate segment '${duplicateSegment}"'...`);
    });

    core.info(`"The file path(s) have been successfully repaired.`);
    core.info(`"END - DUPLICATE PATH AUTO-FIX`);
  }

  const fixedPath = pathSegments.join('/');

  return fixedPath;
}
