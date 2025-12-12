import * as azure from '../src/methods-azure';
import * as core from '@actions/core';
import * as helpers from '../src/methods-helpers';
import * as path from 'path';
import {expect, describe, it, jest, afterEach} from '@jest/globals';
import type {
  BlockBlobParallelUploadOptions,
  BlobUploadCommonResponse,
  BlobDeleteOptions,
  BlobDeleteIfExistsResponse,
  BlobDeleteResponse
} from '@azure/storage-blob';

jest.mock('@actions/core', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setFailed: jest.fn()
}));

jest.mock('@azure/storage-blob', () => {
  const mockUploadFile = jest
    .fn<(filePath: string, options?: BlockBlobParallelUploadOptions) => Promise<BlobUploadCommonResponse>>()
    .mockResolvedValue({errorCode: undefined} as BlobUploadCommonResponse);
  const mockDeleteIfExists = jest
    .fn<(options?: BlobDeleteOptions) => Promise<BlobDeleteIfExistsResponse>>()
    .mockResolvedValue({} as BlobDeleteIfExistsResponse);
  const mockDelete = jest.fn<(options?: BlobDeleteOptions) => Promise<BlobDeleteResponse>>().mockResolvedValue({errorCode: undefined} as BlobDeleteResponse);

  const mockGetBlockBlobClient = jest.fn().mockImplementation(() => ({
    uploadFile: mockUploadFile,
    deleteIfExists: mockDeleteIfExists,
    delete: mockDelete
  }));
  const mockListBlobsFlat = jest.fn().mockReturnValue({
    async *[Symbol.asyncIterator]() {
      /* no-op */
    }
  });
  const mockContainerClient = {
    exists: jest.fn(),
    create: jest.fn<any>().mockResolvedValue(undefined),
    getBlockBlobClient: mockGetBlockBlobClient,
    listBlobsFlat: mockListBlobsFlat
  };

  const mockServiceClient = {
    getContainerClient: jest.fn().mockReturnValue(mockContainerClient)
  };

  class BlobServiceClient {
    static fromConnectionString = jest.fn().mockReturnValue(mockServiceClient);
    constructor() {
      return mockServiceClient;
    }
  }

  return {
    BlobServiceClient,
    __mock: {
      uploadFile: mockUploadFile,
      deleteIfExists: mockDeleteIfExists,
      deleteBlob: mockDelete,
      containerClient: mockContainerClient
    }
  };
});

jest.mock('@azure/identity', () => {
  const credentialMock = jest.fn().mockImplementation(() => ({}));
  return {ClientSecretCredential: credentialMock};
});

const {__mock: blobMock} = jest.requireMock('@azure/storage-blob') as any;

const asyncIterable = (items: {name: string}[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const item of items) {
      yield item;
    }
  }
});

const flushPromises = () => new Promise<void>(resolve => setImmediate(resolve));

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('UploadToAzure', () => {
  it('Should fail if no connection string was provided', async () => {
    await expect(
      azure.UploadToAzure({
        authPayload: {type: 'connection_string', connectionString: ''},
        containerName: 'container-name',
        sourceFolder: 'src/abcd',
        destinationFolder: '',
        cleanDestinationPath: false,
        failIfSourceEmpty: false,
        isRecursive: true,
        deleteIfExists: false
      })
    ).rejects.toThrow('The connection_string cannot be an empty string or a null value.');
  });

  it('Should fail if no service provider was provided', async () => {
    await expect(
      azure.UploadToAzure({
        authPayload: {type: 'service_principal', tenantId: '', clientId: '', clientSecret: '', storageAccount: ''},
        containerName: 'container-name',
        sourceFolder: 'src/abcd',
        destinationFolder: '',
        cleanDestinationPath: false,
        failIfSourceEmpty: false,
        isRecursive: true,
        deleteIfExists: false
      })
    ).rejects.toThrow('The tenant_id cannot be an empty string or a null value.');
  });

  it('Should fail if no source folder was provided', async () => {
    await expect(
      azure.UploadToAzure({
        authPayload: {type: 'connection_string', connectionString: 'connection-string'},
        containerName: 'container-name',
        sourceFolder: '',
        destinationFolder: '',
        cleanDestinationPath: false,
        failIfSourceEmpty: false,
        isRecursive: true,
        deleteIfExists: false
      })
    ).rejects.toThrow('The source_folder cannot be an empty string or a null value.');
  });

  it('Should fail if no container name was provided', async () => {
    await expect(
      azure.UploadToAzure({
        authPayload: {type: 'connection_string', connectionString: 'connection-string'},
        containerName: '',
        sourceFolder: 'src/abcd',
        destinationFolder: '',
        cleanDestinationPath: false,
        failIfSourceEmpty: false,
        isRecursive: true,
        deleteIfExists: false
      })
    ).rejects.toThrow('The container_name cannot be an empty string or a null value.');
  });

  it('uploads a single file, cleans destination and deletes pre-existing blobs', async () => {
    blobMock.containerClient.exists.mockResolvedValue(false);
    blobMock.containerClient.listBlobsFlat.mockReturnValue(asyncIterable([{name: 'dest/old.txt'}]));

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'artifact.txt',
      destinationFolder: 'dest',
      cleanDestinationPath: true,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: true
    });

    expect(blobMock.containerClient.create).toHaveBeenCalledTimes(1);
    expect(blobMock.deleteBlob).toHaveBeenCalledTimes(1);
    expect(blobMock.deleteIfExists).toHaveBeenCalledTimes(1);
    expect(blobMock.uploadFile).toHaveBeenCalledWith('artifact.txt', expect.objectContaining({blobHTTPHeaders: {blobContentType: 'text/plain'}}));
  });

  it('fails when folder discovery is empty and failIfSourceEmpty is enabled', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    blobMock.containerClient.listBlobsFlat.mockReturnValue(asyncIterable([]));
    const findRecursiveSpy = jest.spyOn(helpers, 'FindFilesRecursive').mockResolvedValue([]);

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'src/folder',
      destinationFolder: '',
      cleanDestinationPath: false,
      failIfSourceEmpty: true,
      isRecursive: true,
      deleteIfExists: false
    });

    expect(findRecursiveSpy).toHaveBeenCalledWith(path.normalize('src/folder'));
    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('There are no files'));
    expect(core.setFailed).toHaveBeenCalledWith('Source_Folder is empty or does not exist.');
  });

  it('uploads folder contents discovered via FindFilesFlat', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    blobMock.containerClient.listBlobsFlat.mockReturnValue(asyncIterable([]));
    const findFlatSpy = jest.spyOn(helpers, 'FindFilesFlat').mockResolvedValue(['src/file1.txt']);

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'src',
      destinationFolder: 'out',
      cleanDestinationPath: false,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: false
    });

    await flushPromises();

    expect(findFlatSpy).toHaveBeenCalledWith('src');
    expect(blobMock.uploadFile).toHaveBeenCalledTimes(1);
    expect(blobMock.containerClient.getBlockBlobClient).toHaveBeenCalledWith(expect.stringContaining('file1.txt'));
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('uses service principal credentials and reports upload progress', async () => {
    const identityMock = jest.requireMock('@azure/identity') as {ClientSecretCredential: jest.Mock};
    blobMock.containerClient.exists.mockResolvedValue(true);
    const findFlatSpy = jest.spyOn(helpers, 'FindFilesFlat').mockResolvedValue(['src/file1.txt']);
    blobMock.uploadFile.mockImplementationOnce(async (_filePath: any, options?: BlockBlobParallelUploadOptions) => {
      options?.onProgress?.({loadedBytes: 42});
      return {errorCode: undefined};
    });

    await azure.UploadToAzure({
      authPayload: {
        type: 'service_principal',
        tenantId: 'tenant-id',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        storageAccount: 'storageaccount'
      },
      containerName: 'service-container',
      sourceFolder: 'src',
      destinationFolder: 'out',
      cleanDestinationPath: false,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: false
    });

    await flushPromises();

    expect(identityMock.ClientSecretCredential).toHaveBeenCalledWith('tenant-id', 'client-id', 'client-secret');
    expect(findFlatSpy).toHaveBeenCalledWith('src');
    expect(core.info).toHaveBeenCalledWith('42 bytes uploaded...');
  });

  it('logs failure when single file upload rejects', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    const uploadError = new Error('upload rejected');
    blobMock.uploadFile.mockRejectedValueOnce(uploadError);

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'artifact.txt',
      destinationFolder: '',
      cleanDestinationPath: false,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: false
    });

    expect(core.error).toHaveBeenCalledWith('upload rejected');
    expect(core.setFailed).toHaveBeenCalledWith('upload rejected');
  });

  it('logs failure when folder discovery rejects', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    const scanError = new Error('scan failed');
    jest.spyOn(helpers, 'FindFilesFlat').mockRejectedValueOnce(scanError);

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'src',
      destinationFolder: '',
      cleanDestinationPath: false,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: false
    });

    expect(core.error).toHaveBeenCalledWith('scan failed');
    expect(core.setFailed).toHaveBeenCalledWith('scan failed');
  });

  it('reports blob errors when single file upload returns an error code', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    blobMock.uploadFile.mockResolvedValueOnce({errorCode: 'UPLOAD_ERR'});

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'artifact.txt',
      destinationFolder: '',
      cleanDestinationPath: false,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: false
    });

    expect(core.error).toHaveBeenCalledWith('Error uploading file: UPLOAD_ERR');
  });

  it('trims leading slashes for folder uploads and surfaces blob errors', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    const findFlatSpy = jest.spyOn(helpers, 'FindFilesFlat').mockResolvedValue(['src/file-with-slash.txt']);
    const cleanPathSpy = jest.spyOn(helpers, 'CleanPath');
    cleanPathSpy.mockImplementationOnce(() => '//src');
    cleanPathSpy.mockImplementationOnce(() => '//src//file-with-slash.txt');
    blobMock.uploadFile.mockResolvedValueOnce({errorCode: 'FOLDER_ERR'});

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'src',
      destinationFolder: '',
      cleanDestinationPath: false,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: false
    });

    await flushPromises();

    expect(findFlatSpy).toHaveBeenCalledWith('src');
    expect(core.error).toHaveBeenCalledWith('Error uploading file: FOLDER_ERR');
    expect(blobMock.containerClient.getBlockBlobClient).toHaveBeenCalledWith(expect.stringContaining('file-with-slash.txt'));
  });

  it('logs clean destination delete failures', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    blobMock.containerClient.listBlobsFlat.mockReturnValue(asyncIterable([{name: 'dest/old.txt'}]));
    blobMock.deleteBlob.mockResolvedValueOnce({errorCode: 'delete-failed'});
    const findFlatSpy = jest.spyOn(helpers, 'FindFilesFlat').mockResolvedValue(['src/file.txt']);

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'src',
      destinationFolder: 'dest',
      cleanDestinationPath: true,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: false
    });

    await flushPromises();

    expect(findFlatSpy).toHaveBeenCalledWith('src');
    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('delete-failed'));
  });

  it('logs successful deletion while cleaning destination', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    blobMock.containerClient.listBlobsFlat.mockReturnValue(asyncIterable([{name: 'dest/old.txt'}]));
    blobMock.deleteBlob.mockResolvedValueOnce({errorCode: undefined});

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'artifact.txt',
      destinationFolder: 'dest',
      cleanDestinationPath: true,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: false
    });

    await flushPromises();

    expect(core.info).toHaveBeenCalledWith('Successfully deleted dest/old.txt.');
  });
});
