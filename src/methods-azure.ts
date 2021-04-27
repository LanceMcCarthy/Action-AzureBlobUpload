import * as mime from 'mime-types';
import * as core from '@actions/core';
import {BlobServiceClient, BlobDeleteOptions, DeleteSnapshotsOptionType} from '@azure/storage-blob';
import * as helpers from './methods-helpers';

// *********** INVESTIGATING #124 ************** //
// import path from 'path';

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

  // INTERVENE TO MAKE SURE SOURCE FOLDER/FILE IS CORRECT HERE

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

  core.debug(`sourceFolder: ${sourceFolder}`);
  core.debug(`--- cleaned: ${cleanedSourceFolderPath}`);

  let cleanedDestinationFolder = '';

  if (destinationFolder !== '') {
    // *********** INVESTIGATING #124 ************** //

    // *** INTRODUCED in PR #123, possible breaking change *** //
    // cleanedDestinationFolder = path.normalize(destinationFolder);

    // *** ORIGINAL *** //

    // Replace forward slashes with backward slashes
    cleanedDestinationFolder = destinationFolder.replace(/\\/g, '/');

    // Remove leading slash
    if (cleanedDestinationFolder.startsWith('/')) {
      cleanedDestinationFolder = cleanedDestinationFolder.substr(1);
    }

    // Remove trailing slash
    if (cleanedDestinationFolder.endsWith('/')) {
      cleanedDestinationFolder = cleanedDestinationFolder.slice(0, -1);
    }
    // *** END ORIGINAL *** //

    // ****************** END INVESTIGATION *************** //

    core.debug(`destinationFolder: ${destinationFolder}`);
    core.debug(`-- cleaned: ${cleanedDestinationFolder}`);
  }

  sourcePaths.forEach(async (localFilePath: string) => {
    // *********** INVESTIGATING #124 ************** //

    // *** INTRODUCED in PR #123, possible breaking change *** //
    //const finalPath = helpers.getFinalPathForFileName(localFilePath, cleanedDestinationFolder);

    // *** ORIGINAL *** //
    // Replace forward slashes with backward slashes
    let cleanedFilePath = localFilePath.replace(/\\/g, '/');

    // Remove leading slash
    if (cleanedFilePath.startsWith('/')) {
      cleanedFilePath = cleanedFilePath.substr(1);
    }

    // Remove trailing slash
    if (cleanedFilePath.endsWith('/')) {
      cleanedFilePath = cleanedFilePath.slice(0, -1);
    }

    core.debug(`localFilePath: ${localFilePath}`);
    core.debug(`--- cleaned: ${cleanedFilePath}`);

    // Determining the relative path by trimming the source path from the front of the string.
    const trimmedPath = cleanedFilePath.substr(cleanedSourceFolderPath.length + 1);
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

    // *** END ORIGINAL *** //

    // ****************** END INVESTIGATION *************** //

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
