import * as mime from 'mime-types';
import * as core from '@actions/core';
import {BlobServiceClient, BlobDeleteOptions, DeleteSnapshotsOptionType} from '@azure/storage-blob';
import * as helpers from './methods-helpers';
import path from 'path';

export async function UploadToAzure(
  connectionString: string,
  containerName: string,
  sourceFolder: string,
  destinationFolder: string,
  cleanDestinationPath: boolean,
  failIfSourceEmpty: boolean,
  isRecursive: boolean
) {
  if (connectionString === '') {
    throw new Error('The connection_string cannot be empty.');
  }

  if (sourceFolder === '') {
    throw new Error('The source_folder was not a valid value.');
  }

  // Azure Blob examples for guidance https://docs.microsoft.com/en-us/samples/azure/azure-sdk-for-js/storage-blob-typescript/
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const blobContainerClient = blobServiceClient.getContainerClient(containerName);

  // Create container if it is not in the Azure Storgae Account.
  if ((await blobContainerClient.exists()) === false) {
    core.info(`"Blob container '${containerName}"' does not exist, creating it now...`);
    await blobContainerClient.create();
  }

  // If clean_destination_folder = True, we need to delete all the blobs before uploading
  if (cleanDestinationPath) {
    let blobCount = 0;
    for await (const blob of blobContainerClient.listBlobsFlat()) {
      if (blob.name.startsWith(destinationFolder)) {
        // To prevent a possible race condition where a blob isn't deleted before being replaced,
        // we should also delete the snapshots of the blob to delete and await the promise
        const deleteSnapshotOptions: DeleteSnapshotsOptionType = 'include';
        const deleteOptions: BlobDeleteOptions = {
          deleteSnapshots: deleteSnapshotOptions
        };

        // Delete the blob
        await blobContainerClient.getBlockBlobClient(blob.name).delete(deleteOptions);

        blobCount++;
      }
    }

    core.info(`"Clean complete, ${blobCount} blobs deleted."`);
  }

  let sourcePaths: string[] = [];

  if (isRecursive) {
    // Get an array of all the file paths and subfolder file paths in the source folder
    sourcePaths = await helpers.FindFilesRecursive(sourceFolder);
  } else {
    // Get an array of all the file paths in the source folder
    sourcePaths = await helpers.FindFilesFlat(sourceFolder);
  }

  if (sourcePaths.length < 1) {
    if (failIfSourceEmpty) {
      core.error('There are no files in the source_folder.');
      core.setFailed('Source_Folder is empty or does not exist.');
    } else {
      core.error('Nothing to Upload. There are no files in the source_folder.');
    }
    return;
  }

  // Replace backward slashes with forward slashes
  let cleanedSourceFolderPath = sourceFolder.replace(/\\/g, '/');

  // Remove leading slash
  if (cleanedSourceFolderPath.startsWith('/')) {
    cleanedSourceFolderPath = cleanedSourceFolderPath.substr(1);
  }

  // Remove trailing slash
  if (cleanedSourceFolderPath.endsWith('/')) {
    cleanedSourceFolderPath = cleanedSourceFolderPath.slice(0, -1);
  }

  core.debug(`sourceFolder: ${sourceFolder}`);
  core.debug(`--- cleaned: ${cleanedSourceFolderPath}`);

  let cleanedDestinationFolder = '';

  if (destinationFolder !== '') {
    // Replace forward slashes with backward slashes
    cleanedDestinationFolder = path.normalize(destinationFolder);

    core.debug(`destinationFolder: ${destinationFolder}`);
    core.debug(`-- cleaned: ${cleanedDestinationFolder}`);
  }

  sourcePaths.forEach(async (localFilePath: string) => {
    const finalPath = helpers.getFinalPathForFileName(localFilePath, cleanedDestinationFolder);

    core.debug(`finalPath: ${finalPath}...`);

    // Prevent every file's ContentType from being marked as application/octet-stream.
    const mimeType = mime.lookup(localFilePath);
    const contentTypeHeaders = mimeType ? {blobContentType: mimeType} : {};

    // Upload
    const client = blobContainerClient.getBlockBlobClient(finalPath);
    await client.uploadFile(localFilePath, {blobHTTPHeaders: contentTypeHeaders});
    core.info(`Uploaded ${localFilePath} to ${containerName}/${finalPath}...`);
  });
}
