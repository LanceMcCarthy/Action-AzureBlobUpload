import {promises as fs} from 'fs';
import * as path from 'path';
import * as core from '@actions/core';

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
  core.info('EXECUTING getFinalPathForFileName...');

  core.info(path.join('localFilePath: ', localFilePath));

  const fileName = path.basename(localFilePath);

  let finalPath = fileName;

  core.info(path.join('finalPath - after basename: ', finalPath));

  if (destinationDirectory !== '') {
    // If there is a DestinationFolder set, prefix it to the relative path.
    finalPath = [destinationDirectory, fileName].join('/');
  }

  core.info(path.join('finalPath - after join: ', finalPath));

  // Trim leading slashes, the container is always the root
  if (finalPath.startsWith('/') || finalPath.startsWith('\\')) {
    finalPath = finalPath.substr(1, finalPath.length - 1);
  }

  core.info(path.join('finalPath - after trim slash at start: ', finalPath));

  //Normalize a string path, reducing '..' and '.' parts. When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
  finalPath = path.normalize(finalPath).replace(/\\/g, '/');

  core.info(path.join('finalPath - after normalize: ', finalPath));

  core.info('END getFinalPathForFileName.');

  return finalPath;
}
