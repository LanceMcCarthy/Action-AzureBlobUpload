# Azure Blob Upload

This GitHub Action a simple and easy way to upload any files to any blob container. Just set a source folder and a destination folder and that's it. Here's an example:

```
name: Azure Blob Upload
        with:
          connection_string: ${{ secrets.YourAzureBlobConnectionString }}
          container_name: your-container-name
          source_folder: src\LocalFolderName\
```

If you want to upload the files to a folder in the blob container, you can set a `destination_folder`:

```
name: Azure Blob Upload
    with:
      connection_string: ${{ secrets.YourAzureBlobConnectionString }}
      container_name: your-container-name
      source_folder: src\LocalFolderName\
      source_folder: FolderNameInBlob
```

You can also clean up the target blob location by setting `clean_destination_folder`

```
name: Azure Blob Upload
    with:
      connection_string: ${{ secrets.YourAzureBlobConnectionString }}
      container_name: your-container-name
      source_folder: src\LocalFolderName\
      source_folder: FolderNameInBlob
      clean_destination_folder: true
```