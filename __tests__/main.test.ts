import { uploadToAzure } from '../src/main'

test('validate connection_string', async () => {
  const connection_string = "";
  const container_name = "";
  const source_path = "src/abcd/";
  const destination_folder = "";
  const cleandestination_folder = true;

  await expect(
    uploadToAzure(
      connection_string,
      container_name,
      source_path,
      destination_folder,
      cleandestination_folder)).rejects.toThrow('The connection_string cannot be empty.')
})

test('validate source_path', async () => {
  const connection_string = "XXXXXXXXXXXXXXXXXXXXXXXXXXX";
  const container_name = "";
  const source_path = "";
  const destination_folder = "";
  const cleandestination_folder = true;

  await expect(
    uploadToAzure(
      connection_string,
      container_name,
      source_path,
      destination_folder,
      cleandestination_folder)).rejects.toThrow('The source_path was not a valid value.')
})
