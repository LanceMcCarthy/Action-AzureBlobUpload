import * as mime from 'mime-types';
import * as core from '@actions/core';
import {BlobServiceClient, BlobDeleteOptions, DeleteSnapshotsOptionType} from '@azure/storage-blob';
import * as helpers from './methods-helpers';

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
        let deleteSnapshotOptions: DeleteSnapshotsOptionType = "include";
        let deleteOptions: BlobDeleteOptions = { 
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

  sourcePaths.forEach(async (localFilePath: string) => {
    // Replace forward slashes with backward slashes
    const cleanedSourceFolderPath = sourceFolder.replace(/\\/g, '/');
    const cleanedFilePath = localFilePath.replace(/\\/g, '/');
    let cleanedDestinationFolder = '';

    core.debug(`sourceFolder: ${sourceFolder}`);
    core.debug(`--- cleaned: ${cleanedSourceFolderPath}`);

    core.debug(`localFilePath: ${localFilePath}`);
    core.debug(`--- cleaned: ${cleanedFilePath}`);

    if (destinationFolder !== '') {
      // Replace forward slashes with backward slashes
      cleanedDestinationFolder = destinationFolder.replace(/\\/g, '/');

      // Remove leading and leading slashes
      cleanedDestinationFolder = cleanedDestinationFolder
        .split('/')
        .filter(x => x)
        .join('/');

      core.debug(`destinationFolder: ${destinationFolder}`);
      core.debug(`-- cleaned: ${cleanedDestinationFolder}`);
    }

    // Determining the relative path by trimming the source path from the front of the string.
    const trimStartPosition = cleanedSourceFolderPath.length - 1;
    const trimLength = cleanedFilePath.length - cleanedSourceFolderPath.length + 1;
    const trimmedPath = cleanedFilePath.substr(trimStartPosition, trimLength);

    let finalPath = '';

    if (cleanedDestinationFolder !== '') {
      // If there is a DestinationFolder set, prefix it to the relative path.
      finalPath = [cleanedDestinationFolder, trimmedPath].join('/');
    } else {
      // Otherwise, use the file's relative path (this will maintain all subfolders).
      finalPath = trimmedPath;
    }

    // Trim leading slashes, the container is always the root
    if (finalPath.startsWith('/')) {
      finalPath = finalPath.substr(1);
    }

    // If there are any double slashes in the path, replace them now
    finalPath = finalPath.replace('//', '/');

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
