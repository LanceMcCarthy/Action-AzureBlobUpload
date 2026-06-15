import * as azure from '../src/methods-azure';
import * as core from '@actions/core';
import * as helpers from '../src/methods-helpers';
import * as path from 'path';
import {expect, describe, it, vi, afterEach, beforeAll} from 'vitest';
import type {
  BlockBlobParallelUploadOptions,
  BlobUploadCommonResponse,
  BlobDeleteOptions,
  BlobDeleteIfExistsResponse,
  BlobDeleteResponse
} from '@azure/storage-blob';

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  setFailed: vi.fn()
}));

vi.mock('@azure/storage-blob', () => {
  const mockUploadFile = vi
    .fn<[filePath: string, options?: BlockBlobParallelUploadOptions], Promise<BlobUploadCommonResponse>>()
    .mockResolvedValue({errorCode: undefined} as BlobUploadCommonResponse);
  const mockDeleteIfExists = vi.fn<[options?: BlobDeleteOptions], Promise<BlobDeleteIfExistsResponse>>().mockResolvedValue({} as BlobDeleteIfExistsResponse);
  const mockDelete = vi.fn<[options?: BlobDeleteOptions], Promise<BlobDeleteResponse>>().mockResolvedValue({errorCode: undefined} as BlobDeleteResponse);

  const mockGetBlockBlobClient = vi.fn().mockImplementation(() => ({
    uploadFile: mockUploadFile,
    deleteIfExists: mockDeleteIfExists,
    delete: mockDelete
  }));
  const mockListBlobsFlat = vi.fn().mockReturnValue({
    async *[Symbol.asyncIterator]() {
      /* no-op */
    }
  });
  const mockContainerClient = {
    exists: vi.fn(),
    create: vi.fn<any, any>().mockResolvedValue(undefined),
    getBlockBlobClient: mockGetBlockBlobClient,
    listBlobsFlat: mockListBlobsFlat
  };

  const mockServiceClient = {
    getContainerClient: vi.fn().mockReturnValue(mockContainerClient)
  };

  class BlobServiceClient {
    static fromConnectionString = vi.fn().mockReturnValue(mockServiceClient);
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

vi.mock('@azure/identity', () => {
  const credentialMock = vi.fn().mockImplementation(() => ({}));
  return {ClientSecretCredential: credentialMock};
});

let blobMock: any;

const asyncIterable = (items: {name: string}[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const item of items) {
      yield item;
    }
  }
});

const flushPromises = () => new Promise<void>(resolve => setImmediate(resolve));

beforeAll(async () => {
  const mod = (await import('@azure/storage-blob')) as any;
  blobMock = mod.__mock;
});

afterEach(() => {
  vi.clearAllMocks();
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

  it('Should fail if an unsupported auth payload type is provided', async () => {
    await expect(
      azure.UploadToAzure({
        authPayload: {type: 'invalid_type'} as any,
        containerName: 'container-name',
        sourceFolder: 'src/abcd',
        destinationFolder: '',
        cleanDestinationPath: false,
        failIfSourceEmpty: false,
        isRecursive: true,
        deleteIfExists: false
      })
    ).rejects.toThrow('Unsupported auth payload type: invalid_type');
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
    const findRecursiveSpy = vi.spyOn(helpers, 'FindFilesRecursive').mockResolvedValue([]);

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

  it('does not fail the action when source is empty and failIfSourceEmpty is disabled', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    blobMock.containerClient.listBlobsFlat.mockReturnValue(asyncIterable([]));
    const findRecursiveSpy = vi.spyOn(helpers, 'FindFilesRecursive').mockResolvedValue([]);

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'src/folder',
      destinationFolder: '',
      cleanDestinationPath: false,
      failIfSourceEmpty: false,
      isRecursive: true,
      deleteIfExists: false
    });

    expect(findRecursiveSpy).toHaveBeenCalledWith(path.normalize('src/folder'));
    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('There are no files'));
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(blobMock.uploadFile).not.toHaveBeenCalled();
  });

  it('uploads folder contents discovered via FindFilesFlat', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    blobMock.containerClient.listBlobsFlat.mockReturnValue(asyncIterable([]));
    const findFlatSpy = vi.spyOn(helpers, 'FindFilesFlat').mockResolvedValue(['src/file1.txt']);

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
    const mod = (await import('@azure/identity')) as any;
    blobMock.containerClient.exists.mockResolvedValue(true);
    const findFlatSpy = vi.spyOn(helpers, 'FindFilesFlat').mockResolvedValue(['src/file1.txt']);
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

    expect(mod.ClientSecretCredential).toHaveBeenCalledWith('tenant-id', 'client-id', 'client-secret');
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
    vi.spyOn(helpers, 'FindFilesFlat').mockRejectedValueOnce(scanError);

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

  it('uses empty blob headers when mime type cannot be determined', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);

    await azure.UploadToAzure({
      authPayload: {type: 'connection_string', connectionString: 'UseDevelopmentStorage=true'},
      containerName: 'container',
      sourceFolder: 'artifact.unknownext',
      destinationFolder: '',
      cleanDestinationPath: false,
      failIfSourceEmpty: false,
      isRecursive: false,
      deleteIfExists: false
    });

    expect(blobMock.uploadFile).toHaveBeenCalledWith('artifact.unknownext', expect.objectContaining({blobHTTPHeaders: {}}));
  });

  it('trims leading slashes for folder uploads and surfaces blob errors', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    const findFlatSpy = vi.spyOn(helpers, 'FindFilesFlat').mockResolvedValue(['src/file-with-slash.txt']);
    const cleanPathSpy = vi.spyOn(helpers, 'CleanPath');
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
    const findFlatSpy = vi.spyOn(helpers, 'FindFilesFlat').mockResolvedValue(['src/file.txt']);

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

  it('does not delete blobs outside the destination folder prefix', async () => {
    blobMock.containerClient.exists.mockResolvedValue(true);
    blobMock.containerClient.listBlobsFlat.mockReturnValue(asyncIterable([{name: 'other/old.txt'}]));

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

    expect(blobMock.deleteBlob).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith('All blobs successfully deleted.');
  });
});
