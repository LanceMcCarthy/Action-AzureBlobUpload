# Azure Blob Upload

This GitHub Action a simple and easy way to upload any files to any blob container.
> For a real-world Workflow that uses this, visit [Media File Manager's Workflows](https://github.com/LanceMcCarthy/MediaFileManager/tree/main/.github/workflows) *cd.yml*.

## Examples

> Important: If you copy-paste any example, don't forget to define a version number (e.g. `uses: LanceMcCarthy/Action-AzureBlobUpload@v1.2` ).

### Simplest - Everything

In the most basic form, the Action will upload everything in the `source_folder` to the root of that blob container.

```
- uses: LanceMcCarthy/Action-AzureBlobUpload
  name: Uploading to Azure storage...
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
```

### Most Common - Set a Destination Folder

If you want to upload the files to a folder in the blob container, you can set a `destination_folder`:

```
- uses: LanceMcCarthy/Action-AzureBlobUpload
  name: Azure Blob Upload with Destination folder defined
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
    destination_folder: FolderNameInBlob  # Avoid leading or trailing slashes
```


You can also clean up the target blob location by setting `clean_destination_folder: true`:

```
- uses: LanceMcCarthy/Action-AzureBlobUpload
  name: Azure Blob Upload with Clean Destination enabled
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
    destination_folder: MyTargetFolder # Avoid leading or trailing slashes
    clean_destination_folder: true
```


