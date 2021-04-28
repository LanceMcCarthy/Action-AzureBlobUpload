import * as mime from 'mime-types';
import * as core from '@actions/core';
import * as path from 'path';
import {BlobServiceClient, BlobDeleteOptions, DeleteSnapshotsOptionType, ContainerClient} from '@azure/storage-blob';
import * as helpers from './methods-helpers';
import * as mitigations from './methods-mitigations';

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

  // Normalize paths (removes dot prefixes)
  if (sourceFolder !== '') {
    sourceFolder = path.normalize(sourceFolder);
    core.info(`"Normalized source_folder: ${sourceFolder}"`);
  }

  if (destinationFolder !== '') {
    destinationFolder = path.normalize(destinationFolder);
    core.info(`"Normalized destination_folder: ${destinationFolder}"`);
  }

  // Setup Azure Blob Service Client
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const blobContainerClient = blobServiceClient.getContainerClient(containerName);

  // Create container if it is not in the Azure Storgae Account.
  if ((await blobContainerClient.exists()) === false) {
    core.info(`"Blob container '${containerName}"' does not exist, creating it now...`);
    await blobContainerClient.create();
  }

  // If clean_destination_folder = True, we need to delete all the blobs before uploading
  if (cleanDestinationPath) {
    core.info('clean_destination_path = true, deleting blobs from destination...');

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
      }
    }

    core.info('All blobs successfully deleted.');
  }

  if (path.parse(sourceFolder).ext.length > 0) {
    core.info(`"INFO - source_folder is a single file path, using single file upload mode."`);

    // **************************** SOURCE FOLDER IS A SINGLE FILE PATH ********************* //
    await uploadSingleFile(blobContainerClient, containerName, sourceFolder, destinationFolder).catch(e => {
      core.debug(e.stack);
      core.error(e.message);
      core.setFailed(e.message);
    });
  } else {
    core.info(`"INFO - source_folder is a folder path, using directory upload mode."`);

    // **************************** SOURCE FOLDER IS A FOLDER PATH ********************* //
    await uploadFolderContent(blobContainerClient, containerName, sourceFolder, destinationFolder, isRecursive, failIfSourceEmpty).catch(e => {
      core.debug(e.stack);
      core.error(e.message);
      core.setFailed(e.message);
    });
  }
}

async function uploadSingleFile(blobContainerClient: ContainerClient, containerName: string, localFilePath: string, destinationFolder: string) {
  // Determine file path for file as input
  let finalPath = helpers.getFinalPathForFileName(localFilePath, destinationFolder);

  core.info(`"FinalPathForFileName result: ${finalPath}"`);

  finalPath = mitigations.checkForFirstDuplicateInPath(finalPath);

  // Prevent every file's ContentType from being marked as application/octet-stream.
  const mimeType = mime.lookup(finalPath);
  const contentTypeHeaders = mimeType ? {blobContentType: mimeType} : {};

  // Upload
  const client = blobContainerClient.getBlockBlobClient(finalPath);
  await client.uploadFile(localFilePath, {blobHTTPHeaders: contentTypeHeaders});
  core.info(`Uploaded ${localFilePath} to ${containerName}/${finalPath}...`);
}

async function uploadFolderContent(
  blobContainerClient: ContainerClient,
  containerName: string,
  sourceFolder: string,
  destinationFolder: string,
  isRecursive: boolean,
  failIfSourceEmpty: boolean
) {
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

  const cleanedSourceFolderPath = helpers.CleanPath(sourceFolder);

  core.debug(`sourceFolder: ${sourceFolder}`);
  core.debug(`--- cleaned: ${cleanedSourceFolderPath}`);

  let cleanedDestinationFolder = '';

  if (destinationFolder !== '') {
    cleanedDestinationFolder = helpers.CleanPath(destinationFolder);

    core.debug(`destinationFolder: ${destinationFolder}`);
    core.debug(`-- cleaned: ${cleanedDestinationFolder}`);
  }

  sourcePaths.forEach(async (localFilePath: string) => {
    const cleanedFilePath = helpers.CleanPath(localFilePath);

    core.debug(`localFilePath: ${localFilePath}`);
    core.debug(`--- cleaned: ${cleanedFilePath}`);

    // Determining the relative path by trimming the source path from the front of the string.
    const trimmedPath = cleanedFilePath.substr(cleanedSourceFolderPath.length + 1);
    let finalPath = '';

    if (cleanedDestinationFolder !== '') {
      // If there is a DestinationFolder set, prefix it to the relative path.
      //finalPath = [cleanedDestinationFolder, trimmedPath].join('/');
      finalPath = path.join(cleanedDestinationFolder, trimmedPath);
    } else {
      // Otherwise, use the file's relative path (this will maintain all subfolders).
      finalPath = trimmedPath;
    }

    // Final check to trim any leading slashes that might have been added, the container is always the root
    if (finalPath.startsWith('/')) {
      finalPath = finalPath.substr(1);
    }

    //Normalize a string path, reducing '..' and '.' parts. When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
    finalPath = path.normalize(finalPath);

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
