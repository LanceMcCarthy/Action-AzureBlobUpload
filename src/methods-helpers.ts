import {promises as fs} from 'fs';
import {join, basename, normalize} from 'path';
import * as core from '@actions/core';

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

export function CleanPath(folderPath: string) {
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

export function getFinalPathForFileName(localFilePath: string, destinationDirectory?: string) {
  core.info('EXECUTING getFinalPathForFileName...');

  core.info('"destinationDirectory: ${destinationDirectory}"');
  core.info('"localFilePath: ${localFilePath}"');

  const fileName = basename(localFilePath);

  let finalPath = fileName;

  core.info('"finalPath - after basename: ${finalPath}"');

  if (destinationDirectory !== '') {
    // If there is a DestinationFolder set, prefix it to the relative path.
    finalPath = [destinationDirectory, fileName].join('/');
  }

  core.info('"finalPath - after join: ${finalPath}"');

  // Trim leading slashes, the container is always the root
  if (finalPath.startsWith('/')) {
    finalPath = finalPath.substr(1);
  }

  core.info('"finalPath - after trim slash at start: ${finalPath}"');

  //Normalize a string path, reducing '..' and '.' parts. When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
  finalPath = normalize(finalPath).replace(/\\/g, '/');

  core.info('"finalPath - after normalize: ${finalPath}"');

  core.info('END getFinalPathForFileName.');

  return finalPath;
}
