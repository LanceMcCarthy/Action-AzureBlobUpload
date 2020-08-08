import * as core from '@actions/core'
import * as glob from 'glob';
import { BlobServiceClient } from '@azure/storage-blob';
import { promises as fs } from 'fs';
import { join } from 'path';
import { basename, relative } from 'path';

export async function uploadToAzure(
  connectionString: string,
  containerName: string,
  sourcePath: string,
  destinationPath: string,
  cleanDestinationPath: boolean,
) {
  if (connectionString == "") {
    throw new Error("The connection_string cannot be empty.");
  }

  if (sourcePath == "") {
    throw new Error("The source_path was not a valid value.");
  }

  core.debug(`params: ${containerName}, ${sourcePath}, ${sourcePath}, ${destinationPath}, ${cleanDestinationPath}`);

  // Azure Blob examples for guidance
  //https://docs.microsoft.com/en-us/samples/azure/azure-sdk-for-js/storage-blob-typescript/
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const blobContainerClient = blobServiceClient.getContainerClient(containerName);

  // Create container if it is not in the Azure Storgae Account.
  const containerExists = await blobContainerClient.exists();
  if (containerExists === false) {
    core.info(`"${containerName}" does not exists. Creating a new container...`);
    await blobContainerClient.create();
    core.info(`"${containerName}" container created!`);
  }

  // If clean_destination_path = True, we need to delete all the blobs before uploading
  if (cleanDestinationPath) {
    core.info(`"Clean DestinationPath=True is enabled, deleting blobs in the destination...`);

    let i = 1;
    for await (const blob of blobContainerClient.listBlobsFlat()) {

      const fileName = blob.name;

      if (fileName.startsWith(destinationPath)) {
        const block = blobContainerClient.getBlockBlobClient(fileName);
        block.delete();
      }
    }

    core.info(`"Clean complete, ${i} blobs deleted."`);
  } else {
    core.info("Clean DestinationPath=False, skipping...");
  }

  const sourcePaths = glob.sync(sourcePath);

  sourcePaths.forEach(async (path: any) => {
    const pathStat = await fs.lstat(path);

    if (pathStat.isDirectory()) {

      for (const source of await traverse(path)) {

        const filename = path.replace(/^.*[\\\/]/, '')

        const destination = [filename, relative(path, source).replace(/\\/g, '/')].join('/');

        core.info(`IsDirectory = True: Uploading ${source} to ${destination} ...`);

        await blobContainerClient.getBlockBlobClient(destination).uploadFile(source);
      }
    } else {

      const filename = path.replace(/^.*[\\\/]/, '')

      const destination = [filename, basename(path)].join('/');

      core.info(`IsDirectory = False: Uploading ${path} to ${destination} ...`);

      await blobContainerClient.getBlockBlobClient(path).uploadFile(destination);

    }
  });
}

// Options to consider in future version https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/storage/storage-blob/samples/typescript/src/iterators-blobs-hierarchy.ts
export async function traverse(dir: string) {
  async function _traverse(dir: string, fileList: string[]) {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const path = join(dir, file);
      const stat = await fs.lstat(path);
      if (stat.isDirectory()) {
        fileList = await _traverse(path, fileList);
      } else {
        fileList.push(path);
      }
    }
    return fileList;
  }

  return await _traverse(dir, []);
}

async function run(): Promise<void> {
  const cnnStr = core.getInput('connection_string');
  const contName = core.getInput('container_name');
  const srcPath = core.getInput('source_path');
  const dstPath = core.getInput('destination_path');
  const cleanDst = core.getInput('clean_destination_path');

  await uploadToAzure(cnnStr, contName, srcPath, dstPath, cleanDst.toLowerCase() == 'true');
}

// Showtime!
run().catch(e => {
  core.debug(e.stack);
  core.error(e.message);
  core.setFailed(e.message);
});
