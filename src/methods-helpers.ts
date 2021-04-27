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

export function CleanFolderPath(folderPath: string) {
  let cleanedSourceFolderPath = folderPath.replace(/\\/g, '/');

  // Remove any dot prefix
  if (cleanedSourceFolderPath.startsWith('.')) {
    cleanedSourceFolderPath = cleanedSourceFolderPath.substr(1);
  }

  // Remove leading slash
  if (cleanedSourceFolderPath.startsWith('/')) {
    cleanedSourceFolderPath = cleanedSourceFolderPath.substr(1);
  }

  // Remove trailing slash
  if (cleanedSourceFolderPath.endsWith('/')) {
    cleanedSourceFolderPath = cleanedSourceFolderPath.slice(0, -1);
  }

  return cleanedSourceFolderPath;
}

// *********** INVESTIGATING #124 ************** //
export function getFinalPathForFileName(localFilePath: string, destinationDirectory?: string) {
  // SUSPECT of #124 cause. The base name strips any preceding local path form root
  const fileName = basename(localFilePath);

  // TODO break up the file path to the constituent parts for evaluation and recombination
  //const parts = parse(localFilePath);

  let finalPath = fileName;

  if (destinationDirectory !== '') {
    // If there is a DestinationFolder set, prefix it to the relative path.
    finalPath = [destinationDirectory, fileName].join('/');
  }

  // Trim leading slashes, the container is always the root
  if (finalPath.startsWith('/')) {
    finalPath = finalPath.substr(1);
  }

  //Normalize a string path, reducing '..' and '.' parts. When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
  finalPath = normalize(finalPath).replace(/\\/g, '/');

  return finalPath;
}
