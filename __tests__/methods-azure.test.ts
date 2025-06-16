import * as azure from '../src/methods-azure';
import { expect, describe, test, it, jest, beforeEach, afterEach } from '@jest/globals';
const core = require('@actions/core');

describe('UploadToAzure', () => {
  it('Should fail if no connection string was provided', async () => {
    await expect(azure.UploadToAzure('', 'container-name', 'src/abcd', '', false, false, true, false)).rejects.toThrow(
      'The connection_string cannot be an empty string or a null value.'
    );
  });

  it('Should fail if no source folder was provided', async () => {
    await expect(azure.UploadToAzure('connection-string', 'container-name', '', '', false, false, true, false)).rejects.toThrow(
      'The source_folder cannot be an empty string or a null value.'
    );
  });

  it('Should fail if no container name was provided', async () => {
    await expect(azure.UploadToAzure('connection-string', '', 'src/abcd', '', false, false, true, false)).rejects.toThrow(
      'The container_name cannot be an empty string or a null value.'
    );
  });
});

describe('uploadFolderContent', () => {
  const mockBlobContainerClient = {
    getBlockBlobClient: jest.fn(() => ({
      uploadFile: jest.fn().mockResolvedValue({}),
    })),
  } as any;

  const mockPerformUpload = jest.fn().mockResolvedValue({});
  
  const mockCleanPath = jest.fn((...args: unknown[]) => {
    const p = args[0];
    return typeof p === 'string' ? p.replace(/\\/g, '/') : p;
  });

  const mockFindFilesRecursive = jest.fn();
  const mockFindFilesFlat = jest.fn();

  beforeEach(() => {
    jest.spyOn(require('./methods-helpers'), 'FindFilesRecursive').mockImplementation(mockFindFilesRecursive);
    jest.spyOn(require('./methods-helpers'), 'FindFilesFlat').mockImplementation(mockFindFilesFlat);
    jest.spyOn(require('./methods-helpers'), 'CleanPath').mockImplementation(mockCleanPath);
    jest.spyOn(require('path'), 'join').mockImplementation((...args: []) => args.join('/'));
    jest.spyOn(require('path'), 'normalize').mockImplementation((...args: any[]) => {
      const p = args[0];
      return typeof p === 'string' ? p.replace(/\\/g, '/') : p;
    });
    jest.spyOn(require('path'), 'parse').mockImplementation((...args: any[]) => {
      const p = args[0];
      return { ext: typeof p === 'string' && p.endsWith('.txt') ? '.txt' : '' };
    });
    jest.spyOn(require('path'), 'basename').mockImplementation((...args: unknown[]) => {
      const p = args[0];
      return typeof p === 'string' ? p.split('/').pop() || '' : '';
    });
    jest.spyOn(require('./methods-azure'), 'performUpload').mockImplementation(mockPerformUpload);

    jest.spyOn(require('@actions/core'), 'info').mockImplementation(jest.fn());
    jest.spyOn(require('@actions/core'), 'debug').mockImplementation(jest.fn());
    jest.spyOn(require('@actions/core'), 'error').mockImplementation(jest.fn());
    jest.spyOn(require('@actions/core'), 'setFailed').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls FindFilesRecursive when isRecursive is true', async () => {
    mockFindFilesRecursive.mockImplementation(() => Promise.resolve(['src/file1.txt', 'src/file2.txt']));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', true, false, false
    );
    expect(mockFindFilesRecursive).toHaveBeenCalledWith('src');
  });

  it('calls FindFilesFlat when isRecursive is false', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(mockFindFilesFlat).toHaveBeenCalledWith('src');
  });

  it('handles empty source folder and calls core.error', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve([]));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('There are no files in the source_folder'));
  });

  it('calls core.setFailed if failIfSourceEmpty is true and folder is empty', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve([]));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, true, false
    );
    expect(core.setFailed).toHaveBeenCalledWith('Source_Folder is empty or does not exist.');
  });

  it('uploads each file found in sourcePaths', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt', 'src/file2.txt']));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(mockBlobContainerClient.getBlockBlobClient).toHaveBeenCalledTimes(2);
    expect(mockPerformUpload).toHaveBeenCalledTimes(2);
  });

  it('handles destinationFolder and normalizes paths', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', 'dest', false, false, false
    );
    expect(mockBlobContainerClient.getBlockBlobClient).toHaveBeenCalledWith(expect.stringContaining('dest/'));
  });

  it('trims leading slashes from finalPath', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['/src/file1.txt']));
    mockCleanPath.mockImplementation((p) => '/src/file1.txt');
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', '/src', '', false, false, false
    );
    expect(mockBlobContainerClient.getBlockBlobClient).toHaveBeenCalledWith(expect.not.stringMatching(/^\/.*/));
  });

  it('calls core.error if performUpload returns errorCode', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    mockPerformUpload.mockImplementationOnce(() => Promise.resolve({ errorCode: 'fail' }));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Error uploading file: fail'));
  });

  it('calls core.info if performUpload succeeds', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    mockPerformUpload.mockImplementationOnce(() => Promise.resolve({}));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Successfully uploaded src/file1.txt'));
  });

  it('handles multiple files and different destinationFolder', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt', 'src/file2.txt']));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', 'mydest', false, false, false
    );
    expect(mockBlobContainerClient.getBlockBlobClient).toHaveBeenCalledWith(expect.stringContaining('mydest/'));
    expect(mockBlobContainerClient.getBlockBlobClient).toHaveBeenCalledTimes(2);
  });

  it('handles CleanPath returning empty string', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    mockCleanPath.mockImplementation(() => '');
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(mockBlobContainerClient.getBlockBlobClient).toHaveBeenCalled();
  });

  it('handles CleanPath returning path with leading slash', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    mockCleanPath.mockImplementation((p) => '/src/file1.txt');
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(mockBlobContainerClient.getBlockBlobClient).toHaveBeenCalledWith(expect.not.stringMatching(/^\/.*/));
  });

  it('calls FindFilesRecursive with correct argument', async () => {
    mockFindFilesRecursive.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', true, false, false
    );
    expect(mockFindFilesRecursive).toHaveBeenCalledWith('src');
  });

  it('calls FindFilesFlat with correct argument', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(mockFindFilesFlat).toHaveBeenCalledWith('src');
  });

  it('does not call performUpload if sourcePaths is empty', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve([]));
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(mockPerformUpload).not.toHaveBeenCalled();
  });

  it('handles CleanPath returning undefined', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    mockCleanPath.mockImplementation(() => undefined as any);
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(mockBlobContainerClient.getBlockBlobClient).toHaveBeenCalled();
  });

  it('handles performUpload throwing an error', async () => {
    mockFindFilesFlat.mockImplementation(() => Promise.resolve(['src/file1.txt']));
    mockPerformUpload.mockImplementationOnce(() => { throw new Error('upload failed'); });
    await (require('../src/methods-azure').uploadFolderContent as any)(
      mockBlobContainerClient, 'container', 'src', '', false, false, false
    );
    expect(mockBlobContainerClient.getBlockBlobClient).toHaveBeenCalled();
  });
});
