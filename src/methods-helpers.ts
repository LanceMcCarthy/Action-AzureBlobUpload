import * as path from 'path';
import {promises as fs} from 'fs';

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

export async function FindFilesRecursive(directory: string): Promise<string[]> {
  let fileList: string[] = [];
  const files = await fs.readdir(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const status = await fs.stat(filePath);
    const isDirectory = status.isDirectory();

    if (isDirectory) {
      fileList = [...fileList, ...(await FindFilesRecursive(filePath))];
    } else {
      fileList.push(filePath);
    }
  }

  return fileList;
}

export function CleanPath(folderPath: string): string {
  // Ensure all path separators are forward slashes
  folderPath = folderPath.replace(/\\/g, '/');

  // Remove any dot prefix
  if (folderPath.startsWith('.')) {
    folderPath = folderPath.substring(1);
  }

  // Remove leading slash
  if (folderPath.startsWith('/')) {
    folderPath = folderPath.substring(1);
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
    finalPath = finalPath.substring(1, finalPath.length);
  }

  // Trim leading slashes, the container is always the root
  if (finalPath.startsWith('\\')) {
    finalPath = finalPath.substring(1, finalPath.length);
  }

  //Normalize a string path, reducing '..' and '.' parts. When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
  finalPath = path.normalize(finalPath).replace(/\\/g, '/').replace('//', '/');

  return finalPath;
}
