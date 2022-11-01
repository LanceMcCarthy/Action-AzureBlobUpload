import * as azure from '../src/methods-azure';
import {expect, describe, test, it} from '@jest/globals';

describe('UploadToAzure', () => {
  it('Should fail if no connection string was provided', async () => {
    await expect(azure.UploadToAzure('', 'container-name', 'src/abcd', '', false, false, true, false)).rejects.toThrow(
      'The connection_string cannot be empty.'
    );
  });

  it('Should fail if no source folder was provided', async () => {
    await expect(azure.UploadToAzure('connection-string', 'container-name', '', '', false, false, true, false)).rejects.toThrow(
      'The source_folder was not a valid value.'
    );
  });

  it('Should fail if no container name was provided', async () => {
    await expect(azure.UploadToAzure('connection-string', '', 'src/abcd', '', false, false, true, false)).rejects.toThrow(
      'The container_name cannot be empty.'
    );
  });
});
