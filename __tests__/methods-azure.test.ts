import * as azure from '../src/methods-azure';
import {expect, describe, test, it} from '@jest/globals';

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
    ).rejects.toThrow('The Service Principal properties (tenant_id, client_id, client_secret, or storage_account) cannot contain an empty string or a null value.');
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
});
