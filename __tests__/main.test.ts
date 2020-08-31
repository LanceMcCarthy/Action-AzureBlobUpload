import * as main from '../src/main';

test('validate connection_string', async () => {
  await expect(main.uploadToAzure('', '', 'src/abcd', '', false, false)).rejects.toThrow('The connection_string cannot be empty.');
});

test('validate source_folder', async () => {
  await expect(main.uploadToAzure('XXXXXXXX', '', '', '', false, false)).rejects.toThrow('The source_folder was not a valid value.');
});
