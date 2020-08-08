import { uploadToAzure } from '../src/main'

test('validate connection_string', async () => {
  const connection_string = "";
  const container_name = "";
  const source_folder = "src/abcd/";
  const destination_folder = "";
  const cleandestination_folder = true;

  await expect(
    uploadToAzure(
      connection_string,
      container_name,
      source_folder,
      destination_folder,
      cleandestination_folder)).rejects.toThrow('The connection_string cannot be empty.')
})

test('validate source_folder', async () => {
  const connection_string = "XXXXXXXXXXXXXXXXXXXXXXXXXXX";
  const container_name = "";
  const source_folder = "";
  const destination_folder = "";
  const cleandestination_folder = true;

  await expect(
    uploadToAzure(
      connection_string,
      container_name,
      source_folder,
      destination_folder,
      cleandestination_folder)).rejects.toThrow('The source_folder was not a valid value.')
})
