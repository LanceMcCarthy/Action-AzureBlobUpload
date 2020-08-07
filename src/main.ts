import * as core from '@actions/core'
import { getInput } from '@actions/core';
import { BlobServiceClient } from '@azure/storage-blob';
import { promises as fs } from 'fs';
import { join } from 'path';
import { basename, relative } from 'path';
import * as glob from 'glob';

async function run(): Promise<void> {
  const connectionString = getInput('connection_string');
  const containerName = getInput('container_name');
  const sourcePath = getInput('source_path');
  const destinationPath = getInput('destination_path');
  const cleanDestinationPath = getInput('clean_destination_path');

  //core.debug(`vars: ${containerName}, ${sourcePath}, ${sourcePath}, ${destinationPath}, ${cleanDestinationPath}`);

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const blobContainerClient = blobServiceClient.getContainerClient(containerName);

  const containerPresent = await blobContainerClient.exists();

  if(containerPresent == false){
    core.info(`"${containerName}" did not exist, creating a new one now...`);
    await blobContainerClient.create();
  }

  if (!(await blobContainerClient.exists())) {
    core.info(`"${containerName}" did not exist, creating a new one now...`);
    await blobContainerClient.create();
  }

  if (cleanDestinationPath) {
    // clean out desintation before uploading
    for await (const blob of blobContainerClient.listBlobsFlat()) {
      if (blob.name.startsWith(destinationPath)) {
        blobContainerClient.getBlockBlobClient(blob.name).delete();
      }
    }
  }

  const sourcePaths = glob.sync(sourcePath);

  for (const path of sourcePaths) {
    const stat = await fs.lstat(path);

    if (stat.isDirectory()) {

      for (const source of await traverseFolders(path)) {

        const destination = [name, relative(path, source).replace(/\\/g, '/')].join('/');
        core.info(`Uploading ${source} to ${destination} ...`);

        await blobContainerClient.getBlockBlobClient(destination).uploadFile(source);
      }

    } else {

      const destination = [name, basename(path)].join('/');
      core.info(`Uploading ${path} to ${destination} ...`);

      await blobContainerClient.getBlockBlobClient(path).uploadFile(destination);

    }
  }
}

export async function traverseFolders(dir: string) {
  async function nestedTraverse(dir: string, fileList: string[]) {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const path = join(dir, file);
      const stat = await fs.lstat(path);
      if (stat.isDirectory()) {
        fileList = await nestedTraverse(path, fileList);
      } else {
        fileList.push(path);
      }
    }
    return fileList;
  }

  return await nestedTraverse(dir, []);
}

// Showtime!
run().catch(e => {
  core.debug(e.stack);
  core.error(e.message);
  core.setFailed(e.message);
});
