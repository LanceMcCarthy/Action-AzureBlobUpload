import {promises as fs} from 'fs';

import {join, basename, normalize} from 'path';
export async function FindFilesFlat(directory: string) {
  const fileList: string[] = [];

  const files = await fs.readdir(directory);

  for (const file of files) {
    const path = join(directory, file);
    const status = await fs.stat(path);
    const isDirectory = status.isDirectory();

    if (!isDirectory) {
      fileList.push(path);
    }
  }

  return fileList;
}

export async function FindFilesRecursive(directory: string) {
  let fileList: string[] = [];

  const files = await fs.readdir(directory);

  for (const file of files) {
    const path = join(directory, file);
    const status = await fs.stat(path);
    const isDirectory = status.isDirectory();

    if (isDirectory) {
      fileList = [...fileList, ...(await FindFilesRecursive(path))];
    } else {
      fileList.push(path);
    }
  }

  return fileList;
}

export function getFinalPathForFileName(localFilePath: string, destinationDirectory?: string) {
  const fileName = basename(localFilePath);
  let finalPath = fileName;
  if (destinationDirectory !== '') {
    // If there is a DestinationFolder set, prefix it to the relative path.
    finalPath = [destinationDirectory, fileName].join('/');
  }

  // Trim leading slashes, the container is always the root
  if (finalPath.startsWith('/')) {
    finalPath = finalPath.substr(1);
  }

  finalPath = normalize(finalPath).replace(/\\/g, '/').replace(/\/\//g, '/');
  return finalPath;
}
