import * as main from '../src/main';
import * as helpers from '../src/methods-helpers';
import * as azure from '../src/methods-azure';

// Make sure the error occurs when the connection string parameter is missing
test('Azure - UploadToAzure connection_string validation', async () => {
  await expect(azure.UploadToAzure('', '', 'src/abcd', '', false, false, true)).rejects.toThrow('The connection_string cannot be empty.');
});

// Make sure there is an error when the source older parameter is missing
test('Azure - UploadToAzure source_folder validation', async () => {
  await expect(azure.UploadToAzure('XXXXXXXX', '', '', '', false, false, true)).rejects.toThrow('The source_folder was not a valid value.');
});

test('Helpers - FindFilesFlat', async () => {
  const files = await helpers.FindFilesFlat('./src/TestData/TextFileTestRoot');
  expect(files.length).toBeGreaterThanOrEqual(2);
});

test('Helpers - FindFilesRecursive', async () => {
  const files = await helpers.FindFilesRecursive('./src/TestData/');
  expect(files.length).toBeGreaterThan(0);
});
