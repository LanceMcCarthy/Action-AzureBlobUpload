import * as azure from '../src/methods-azure';
import {expect, describe, test, it} from '@jest/globals';

describe('UploadToAzure', () => {
  it('Should fail if no connection string was provided', async () => {
    await expect(azure.UploadToAzure('', '', 'src/abcd', '', false, false, true)).rejects.toThrow('The connection_string cannot be empty.');
  });

  it('Should fail if no source folder was provided', async () => {
    await expect(azure.UploadToAzure('XXXXXXXX', '', '', '', false, false, true)).rejects.toThrow('The source_folder was not a valid value.');
  });
});
