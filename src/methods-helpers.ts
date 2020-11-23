import {promises as fs} from 'fs';
import {join} from 'path';

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
