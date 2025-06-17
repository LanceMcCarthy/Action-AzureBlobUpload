import * as core from '@actions/core';
import * as helpers from './methods-helpers';
import * as mime from 'mime-types';
import * as mitigations from './methods-mitigations';
import * as path from 'path';
import * as azure from '@azure/storage-blob';

/**
 * Main function uploads the contents of a folder to Azure Blob Storage. See main.ts for parameter explainations.
 */
export async function UploadToAzure(
  connectionString: string,
  containerName: string,
  sourceFolder: string,
  destinationFolder: string,
  cleanDestinationPath: boolean,
  failIfSourceEmpty: boolean,
  isRecursive: boolean,
  deleteIfExists: boolean
) {
  // Validate parameters
  helpers.validateNonEmptyString(connectionString, 'connection_string');
  helpers.validateNonEmptyString(containerName, 'container_name');
  helpers.validateNonEmptyString(sourceFolder, 'source_folder');

  // Normalize paths (removes dot prefixes and incorrect directory separators)
  sourceFolder = helpers.normalizePath(sourceFolder, 'source_folder');
  destinationFolder = helpers.normalizePath(destinationFolder, 'destination_folder');

  // Setup Azure Blob Service Client
  const blobServiceClient = azure.BlobServiceClient.fromConnectionString(connectionString);
  const blobContainerClient = blobServiceClient.getContainerClient(containerName);

  // Create container if it is not in the Azure Storage Account.
  if ((await blobContainerClient.exists()) === false) {
    core.info(`"Blob container '${containerName}"' does not exist, creating it now...`);
    await blobContainerClient.create();
  }

  // ***************** SECTION: CLEAN DESTINATION ***************** //

  // If clean_destination_folder = True, we need to delete all the blobs before uploading
  if (cleanDestinationPath) {
    core.info('clean_destination_path = true, deleting blobs from destination...');

    await cleanDestination(blobContainerClient, destinationFolder);

    core.info('All blobs successfully deleted.');
  }

  // *********************** SECTION: UPLOAD ******************** //

  // Check if the source_folder value is filename or a folder path
  if (path.parse(sourceFolder).ext.length > 0) {
    // SINGLE FILE UPLOAD MODE
    await uploadSingleFile(blobContainerClient, containerName, sourceFolder, destinationFolder, deleteIfExists).catch(e => {
      core.debug(e.stack);
      core.error(e.message);
      core.setFailed(e.message);
    });
  } else {
    // DIRECTORY CONTENTS UPLOAD MODE
    await uploadFolderContent(blobContainerClient, containerName, sourceFolder, destinationFolder, isRecursive, failIfSourceEmpty, deleteIfExists).catch(e => {
      core.debug(e.stack);
      core.error(e.message);
      core.setFailed(e.message);
    });
  }

  // ************************ END SECTION ************************ //
}

/**
 * Uploads a single file to Azure Blob Storage
 */
export async function uploadSingleFile(
  blobContainerClient: azure.ContainerClient,
  containerName: string,
  localFilePath: string,
  destinationFolder: string,
  deleteIfExists: boolean
) {
  core.info(`"INFO - source_folder is a single file path... using single file upload mode."`);

  // Determine file path for file as input
  let finalPath = helpers.getFinalPathForFileName(localFilePath, destinationFolder);

  // MITIGATION - This is to handle situations where an extra repository name is in the file path
  finalPath = mitigations.checkForFirstDuplicateInPath(finalPath);

  // Get a blob client for the blob to be uploaded
  const client = blobContainerClient.getBlockBlobClient(finalPath);

  // Perform the upload
  const result = await performUpload(client, localFilePath, deleteIfExists);

  // Check result
  if (result.errorCode) {
    core.error(`Error uploading file: ${result.errorCode}`);
  } else {
    core.info(`Successfully uploaded ${localFilePath} to ${containerName}/${finalPath}.`);
  }
}

/**
 *  Function that uploads the contents of a folder to Azure Blob Storage
 */
export async function uploadFolderContent(
  blobContainerClient: azure.ContainerClient,
  containerName: string,
  sourceFolder: string,
  destinationFolder: string,
  isRecursive: boolean,
  failIfSourceEmpty: boolean,
  deleteIfExists: boolean
) {
  core.info(`"INFO - source_folder is a folder path... using normal directory content upload mode."`);

  let sourcePaths: string[] = [];

  if (isRecursive) {
    // Get an array of all the file paths and subfolder file paths in the source folder
    sourcePaths = await helpers.FindFilesRecursive(sourceFolder);
  } else {
    // Get an array of all the file paths in the source folder
    sourcePaths = await helpers.FindFilesFlat(sourceFolder);
  }

  if (sourcePaths.length < 1) {
    core.error('There are no files in the source_folder, please double check your folder path (confirm it is correct and has content).');

    if (failIfSourceEmpty) {
      core.setFailed('Source_Folder is empty or does not exist.');
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
    const trimmedPath = cleanedFilePath.slice(cleanedSourceFolderPath.length + 1);
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
      finalPath = finalPath.slice(1);
    }

    //Normalize a string path, reducing '..' and '.' parts. When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved. On Windows backslashes are used.
    finalPath = path.normalize(finalPath);

    core.debug(`finalPath: ${finalPath}...`);

    // Get a client reference for the blob file
    const client = blobContainerClient.getBlockBlobClient(finalPath);

    // Perform the upload
    const result = await performUpload(client, localFilePath, deleteIfExists);

    // Check the results
    if (result.errorCode) {
      core.error(`Error uploading file: ${result.errorCode}`);
    } else {
      core.info(`Successfully uploaded ${localFilePath} to ${containerName}/${finalPath}.`);
    }
  });
}

export async function performUpload(client: azure.BlockBlobClient, localFilePath: string, deleteIfExists: boolean): Promise<azure.BlobUploadCommonResponse> {
  // Delete the blob file if it exists
  if (deleteIfExists) {
    // To prevent a possible race condition where a blob isn't deleted before being replaced
    //we should also delete the snapshots of the blob and await any promises
    const deleteSnapshotOptions: azure.DeleteSnapshotsOptionType = 'include';
    const deleteOptions: azure.BlobDeleteOptions = {
      deleteSnapshots: deleteSnapshotOptions
    };

    client.deleteIfExists(deleteOptions);
  }

  // Check the local mime type of the file to prevent every file's ContentType from being marked as 'application/octet-stream'.
  const mimeType = mime.lookup(localFilePath);
  const contentTypeHeaders = mimeType ? {blobContentType: mimeType} : {};

  // Put the mime type in the header, and track progress to help with large uploads
  const uploadOptions: azure.BlockBlobParallelUploadOptions = {
    blobHTTPHeaders: contentTypeHeaders,
    onProgress: p => {
      core.info(`${p.loadedBytes} bytes uploaded...`);
    }
  };

  // Perform the upload
  const result = await client.uploadFile(localFilePath, uploadOptions);

  return result;
}

export async function cleanDestination(containerClient: azure.ContainerClient, destinationFolder: string) {
  core.info('clean_destination_path = true, deleting blobs from destination...');

  for await (const blob of containerClient.listBlobsFlat()) {
    if (blob.name.startsWith(destinationFolder)) {
      // Get blob client
      const client = containerClient.getBlockBlobClient(blob.name);

      // To prevent a possible race condition where a blob isn't deleted before being replaced
      //we should also delete the snapshots of the blob and await any promises
      const deleteSnapshotOptions: azure.DeleteSnapshotsOptionType = 'include';
      const deleteOptions: azure.BlobDeleteOptions = {
        deleteSnapshots: deleteSnapshotOptions
      };

      // Delete the folder
      const result = await client.delete(deleteOptions);

      // check results
      if (result.errorCode) {
        core.error(`There was a problem deleting ${blob.name}. Error: ${result.errorCode}`);
      } else {
        core.info(`Successfully deleted ${blob.name}.`);
      }
    }
  }
}
