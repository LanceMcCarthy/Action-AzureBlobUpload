import * as core from '@actions/core'
import * as glob from 'glob';
import * as helpers from './helpers';
import { BlobServiceClient } from '@azure/storage-blob';
import { promises as fs } from 'fs';
import { basename, relative } from 'path';
import { join } from 'path';

export async function uploadToAzure(
  connectionString: string,
  containerName: string,
  sourcePath: string,
  destinationFolder: string,
  cleanDestinationPath: boolean,
) {
  if (connectionString == "") {
    throw new Error("The connection_string cannot be empty.");
  }

  if (sourcePath == "") {
    throw new Error("The source_path was not a valid value.");
  }

  core.info(`Parameters - ContainerName: ${containerName}, sourcePath:  ${sourcePath}, destinationPath:  ${destinationFolder}, cleanDestinationPath:  ${cleanDestinationPath}`);

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

  // If clean_destination_folder = True, we need to delete all the blobs before uploading
  if (cleanDestinationPath) {
    core.info(`"Clean DestinationPath=True is enabled, deleting blobs in the destination...`);

    let i = 0;

    for await (const blob of blobContainerClient.listBlobsFlat()) {
      const fileName = blob.name;
      if (fileName.startsWith(destinationFolder)) {
        const block = blobContainerClient.getBlockBlobClient(fileName);
        block.delete();
        i++;
      }
    }

    core.info(`"Clean complete, ${i} blobs deleted."`);
  } else {
    core.info("Clean DestinationPath=False, skipping...");
  }

  // Get all file paths for the local content (includes subfolders and files)
  //const sourcePaths = glob.sync(sourcePath);

  const sourcePaths = await walk(sourcePath);

  sourcePaths.forEach(async (path: any) => {
    const stat = await fs.lstat(path);

    if (stat.isDirectory()) {
      //is a file in a subfolder
      const paths = await walk(path);

      paths.forEach(async (source: any) => {
        const src = relative(path, source).replace(/^.*[\\\/]/, '');
        const dst = [destinationFolder, src].join('/');

        core.info(`Uploading (IsDirectory=True) - TopSourcePath: ${path}, SourcePath ${source}, UpdatedSourcePath: ${src}, DestinationPath: ${dst}`);
  
        // https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/storage/storage-blob/samples/typescript/src/iterators-blobs-hierarchy.ts
        await blobContainerClient.getBlockBlobClient(dst).uploadFile(src);

        core.info(`Uploaded ${source} to ${dst}...`);
      });

    } 
    else {
      // A file in toplevel folder
      
      const basenameSource = basename(path);
      const dst = [destinationFolder, ].join('/');

      core.info(`Uploading (IsDirectory=True) - OriginalPath: ${path}, UpdatedSourcePath: ${basenameSource}, DestinationPath: ${dst}`);

      await blobContainerClient.getBlockBlobClient(dst).uploadFile(basenameSource);
    }
  });
}

export default async function walk(directory: string) {
  let fileList: string[] = [];

  const files = await fs.readdir(directory);

  for (const file of files) {
    const p = join(directory, file);
    if ((await fs.stat(p)).isDirectory()) {
      fileList = [...fileList, ...(await walk(p))];
    } else {
      fileList.push(p);
    }
  }

  return fileList;
}

async function run(): Promise<void> {
  const cnnStr = core.getInput('connection_string');
  const contName = core.getInput('container_name');
  const srcPath = core.getInput('source_path');
  const dstPath = core.getInput('destination_folder');
  const cleanDst = core.getInput('clean_destination_folder');

  await uploadToAzure(cnnStr, contName, srcPath, dstPath, cleanDst.toLowerCase() == 'true');
}

// Showtime!
run().catch(e => {
  core.debug(e.stack);
  core.error(e.message);
  core.setFailed(e.message);
});
