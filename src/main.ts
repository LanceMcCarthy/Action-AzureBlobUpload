import * as core from '@actions/core'
import * as mime from 'mime-types'
import {BlobServiceClient} from '@azure/storage-blob'
import {promises as fs} from 'fs'
import {join} from 'path'

export async function uploadToAzure(
  connectionString: string,
  containerName: string,
  sourceFolder: string,
  destinationFolder: string,
  cleanDestinationPath: boolean,
  failIfSourceEmpty: boolean
) {
  if (connectionString === '') {
    throw new Error('The connection_string cannot be empty.')
  }

  if (sourceFolder === '') {
    throw new Error('The source_folder was not a valid value.')
  }

  // Azure Blob examples for guidance https://docs.microsoft.com/en-us/samples/azure/azure-sdk-for-js/storage-blob-typescript/
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    connectionString
  )
  const blobContainerClient = blobServiceClient.getContainerClient(
    containerName
  )

  // Create container if it is not in the Azure Storgae Account.
  if ((await blobContainerClient.exists()) == false) {
    core.info(
      `"Blob container '${containerName}"' does not exist, creating it now...`
    )
    await blobContainerClient.create()
  }

  // If clean_destination_folder = True, we need to delete all the blobs before uploading
  if (cleanDestinationPath) {
    let blobCount = 0
    for await (const blob of blobContainerClient.listBlobsFlat()) {
      if (blob.name.startsWith(destinationFolder)) {
        blobContainerClient.getBlockBlobClient(blob.name).delete()
        blobCount++
      }
    }

    core.info(`"Clean complete, ${blobCount} blobs deleted."`)
  }

  // Get an array of all the file paths in the source folder
  const sourcePaths = await walk(sourceFolder)

  if (sourcePaths.length < 1) {
    if (failIfSourceEmpty) {
      core.error('There are no files in the source_folder.')
      core.setFailed('Source_Folder is empty or does not exist.')
    } else {
      core.error('Nothing to Upload. There are no files in the source_folder.')
    }
    return
  }

  sourcePaths.forEach(async (localFilePath: any) => {
    // Replacing forward slashes with backward slashes
    const cleanedSourceFolderPath = sourceFolder.replace(/\\/g, '/')
    const cleanedFilePath = localFilePath.replace(/\\/g, '/')
    let cleanedDestinationFolder = destinationFolder.replace(/\\/g, '/')
    let completeDestinationPath = ''

    // Remove leading and leading slashes
    cleanedDestinationFolder = cleanedDestinationFolder
      .split('/')
      .filter(x => x)
      .join('/')

    // Determining the relative path by trimming the source path from the front of the string.
    const trimmedPath = cleanedFilePath.substr(
      cleanedSourceFolderPath.length,
      cleanedFilePath.length - cleanedSourceFolderPath.length
    )

    if (completeDestinationPath === '') {
      // If there is a DestinationFolder set, prefix it to the relative path.
      completeDestinationPath = [cleanedDestinationFolder, trimmedPath].join(
        '/'
      )
    } else {
      // Otherwise, use the file's relative path (this will maintain all subfolders!).
      completeDestinationPath = trimmedPath
    }

    // Prevent every file's ContentType from being marked as application/octet-stream.
    const mimeType = mime.lookup(localFilePath)
    const contentTypeHeaders = mimeType ? {blobContentType: mimeType} : {}

    // Upload
    const client = blobContainerClient.getBlockBlobClient(
      completeDestinationPath
    )
    await client.uploadFile(localFilePath, {
      blobHTTPHeaders: contentTypeHeaders
    })

    core.info(`Uploaded ${localFilePath} to ${completeDestinationPath}...`)
  })
}

export async function walk(directory: string) {
  let fileList: string[] = []

  const files = await fs.readdir(directory)

  for (const file of files) {
    const p = join(directory, file)
    if ((await fs.stat(p)).isDirectory()) {
      fileList = [...fileList, ...(await walk(p))]
    } else {
      fileList.push(p)
    }
  }

  return fileList
}

async function run(): Promise<void> {
  const cnnStr = core.getInput('connection_string')
  const contName = core.getInput('container_name')
  const srcPath = core.getInput('source_folder')
  const dstPath = core.getInput('destination_folder')
  const cleanDst =
    core.getInput('clean_destination_folder').toLowerCase() == 'true'
  const fail = core.getInput('fail_if_source_empty').toLowerCase() == 'true'

  await uploadToAzure(cnnStr, contName, srcPath, dstPath, cleanDst, fail).catch(
    e => {
      core.debug(e.stack)
      core.error(e.message)
      core.setFailed(e.message)
    }
  )
}

// Showtime!
run()
