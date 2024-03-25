import * as path from 'path';
import * as core from '@actions/core';
import {promises as fs} from 'fs';

export const validateNonEmptyString = (param: string, paramName: string) => {
  if (param === '') {
    throw new Error(`The ${paramName} cannot be an empty string or a null value.`);
  }
};

export function normalizePath(filePath: string, paramName: string): string {
  const result = path.normalize(filePath);
  core.info(`"Normalized ${paramName}! Updated ${filePath} to ${result}"`);
  return result;
}

export async function FindFilesFlat(directory: string): Promise<string[]> {
  const fileList: string[] = [];
  const files = await fs.readdir(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const status = await fs.stat(filePath);
    const isDirectory = status.isDirectory();

    if (!isDirectory) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

// Original version. Keeping in the code until the new version has proven itself in the real world.
// export async function FindFilesRecursive(directory: string): Promise<string[]> {
//   let fileList: string[] = [];
//   const files = await fs.readdir(directory);

//   for (const file of files) {
//     const filePath = path.join(directory, file);
//     const status = await fs.stat(filePath);
//     const isDirectory = status.isDirectory();

//     if (isDirectory) {
//       fileList = [...fileList, ...(await FindFilesRecursive(filePath))];
//     } else {
//       fileList.push(filePath);
//     }
//   }

//   return fileList;
// }

// Optimized version of FindFilesRecursive that runs the directory and file map in parallel.
export async function FindFilesRecursive(directory: string): Promise<string[]> {
  const files = await fs.readdir(directory);
  const filePaths = files.map(file => path.join(directory, file));
  const stats = await Promise.all(filePaths.map(async filePath => fs.stat(filePath)));

  const fileList = await Promise.all(
    filePaths.map(async (filePath, index) => {
      if (stats[index].isDirectory()) {
        return await FindFilesRecursive(filePath);
      } else {
        return filePath;
      }
    })
  );

  return fileList.flat();
}

export function CleanPath(folderPath: string): string {
  // Ensure all path separators are forward slashes
  folderPath = folderPath.replace(/\\/g, '/');

  // Remove any dot prefix
  if (folderPath.startsWith('.')) {
    folderPath = folderPath.substr(1);
  }

  // Remove leading slash
  if (folderPath.startsWith('/')) {
    folderPath = folderPath.substr(1);
  }

  // Remove trailing slash
  if (folderPath.endsWith('/')) {
    folderPath = folderPath.slice(0, -1);
  }

  return folderPath;
}

export function getFinalPathForFileName(localFilePath: string, destinationDirectory?: string): string {
  const fileName = path.basename(localFilePath);

  let finalPath = fileName;

  if (destinationDirectory !== '') {
    // If there is a DestinationFolder set, prefix it to the relative path.
    finalPath = [destinationDirectory, fileName].join('/');
  }

  // Trim leading slashes, the container is always the root
  if (finalPath.startsWith('/')) {
    finalPath = finalPath.substr(1, finalPath.length - 1);
  }

  // Trim leading slashes, the container is always the root
  if (finalPath.startsWith('\\')) {
    finalPath = finalPath.substr(1, finalPath.length - 1);
  }

  //Normalize a string path, reducing '..' and '.' parts. When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
  finalPath = path.normalize(finalPath).replace(/\\/g, '/').replace('//', '/');

  return finalPath;
}
