# Azure Blob Upload

This GitHub Action a simple and easy way to upload any files to any blob container.

* There are a few samples below to help you get started (under the Examples section).
* Visit this repo's [main_release.yml workflow](https://github.com/LanceMcCarthy/Action-AzureBlobUpload/blob/main/.github/workflows/main_release.yml) to see the working tests for examples of different use cases.
* To see a production app using this Action, visit [Media File Manager](https://github.com/LanceMcCarthy/MediaFileManager) repo's [cd_release_sideload.yml](https://github.com/LanceMcCarthy/MediaFileManager/blob/main/.github/workflows/cd_release_sideload.yml) workflow.

| Workflow | Status |
|----------|--------|
| `main and releases` | [![Main and Releases](https://github.com/LanceMcCarthy/Action-AzureBlobUpload/actions/workflows/main_release.yml/badge.svg)](https://github.com/LanceMcCarthy/Action-AzureBlobUpload/actions/workflows/main_release.yml) |

## Inputs

Below are the action's inputs that need to be defined in the Action's `with` block.

| Required | Inputs | Example | Summary |
|----------|--------|---------|---------|
| | connection_string | `${{ secrets.AZURE_CONNECTION_STRING }}` | Azure Blob Storage conection string (for help, visit [View Account Access Keys](https://docs.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage#view-account-access-keys)). |\
|  | tenant_id | `${{ secrets.AZURE_TENANT_ID }}` | The App Registration tenant ID used for Service Principal authentication. |
|  | client_id | `${{ secrets.AZURE_CLIENT_ID }}` | The App Registration client (application) ID used for Service Principal authentication. |
|  | client_secret | `${{ secrets.AZURE_CLIENT_SECRET }}` |The App Registration client secret used for Service Principal authentication. |
|  | storage_account | `storageaccount` | The name of the Azure Storage account to be accessed. Need for authenticating a Service Principal. |
| ✔ | container_name | `my-container` | Name of the Blob container. |
| ✔ | source_folder |  `src\LocalFolderName\` | Folder with the files to upload. Note that the path separators will be automatically normalized for you. |
|  | destination_folder | `MyTargetFolder/Subfolder` | Folder to upload to (it will be created for you if it does not exist). |
|  | clean_destination_folder |  `false` (default)| Delete all destination files before uploading new ones. |
|  | fail_if_source_empty | `false` (default)| Set to `true` if you want action to fail if source folder has no files. |
|  | is_recursive | `true` (default)| Set to `false` if you want all subfolders ignored. |
|  | delete_if_exists | `false` (default)| Set to `true` if you want to overwrite an exiting blob with the same filename. |

## Examples

If you copy-paste from the examples below, **don't forget to use a real version number** at the end of action name. For example, an exact version number `LanceMcCarthy/Action-AzureBlobUpload@v2.0.0`, or you can use the 'latest version' tag `LanceMcCarthy/Action-AzureBlobUpload@v2`.

### Basic Use

In the most basic form, the Action will upload all the files in the `source_folder` to the root of that blob container.

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@v2
  name: Uploading to Azure storage...
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
```
### Connection String Authentication

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@v2
  name: Uploading to Azure storage...
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
```

### Service Prinicipal Authentication (App Registration)

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@v2
  name: Uploading to Azure storage...
  with:
    tenant_id: ${{ secrets.YourTenantID }}
    client_id: ${{ secrets.YourClientID }}
    client_secret: ${{ secrets.YourClientSecret }}
    storage_account: your-storage-account
    container_name: your-container-name
    source_folder: src\LocalFolderName\
```



### Set a Destination Folder (most common)

If you want to upload the files to a folder in the blob container, you can set a `destination_folder`.

In this example, we use `clean_destination_folder`, which gives you a clean start for the entire operation.

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@v2
  name: Azure Blob Upload with Destination folder defined
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
    destination_folder: FolderNameInAzureStorage
    clean_destination_folder: true
```

Alternatively, you can use `delete_if_exists` if you only want to overwrite some files, but keep the rest.

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@v2
  name: Azure Blob Upload with Destination folder defined
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
    destination_folder: FolderNameInAzureStorage
    delete_if_exists: true
```

### Ignore Subfolder

If you want to upload *only* files in the `source_folder` and skip subfolders and subfolder files, set `is_recursive` to `false`.

```yaml
- name: Upload Text Files Non-recursive
  uses: LanceMcCarthy/Action-AzureBlobUpload@v2
  with:
    connection_string: ${{ secrets.AzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
    destination_folder: FolderNameInAzureStorage
    clean_destination_folder: true
    is_recursive: false
```

### Single File Mode

You can set the `source_folder` to a single file path to upload only one file. For example, this one uploads *MySingleFileApplication.exe*.

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@v2
  name: Azure Blob Upload with Destination folder defined
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\MySingleFileApplication.exe
    destination_folder: FolderNameInAzureStorage
```

### Advanced - Full Control

Here is an example that might represent a real-world Workflow that needs precise control over things.

* The source folder uses an environment variable uses (see [Using Variables in Actions](https://docs.github.com/en/actions/configuring-and-managing-workflows/using-variables-and-secrets-in-a-workflow)).
* The connection string uses a secrets variable.
* The desination folder combines a name and the run number of the workflow (see [GitHub Context variables](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#github-context)).
* The action will fail and stop the Workflow if there are no files to upload.

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@v2
  name: Azure Blob Upload with Destination folder defined
  with:
    connection_string: ${{ secrets.DeploymentsBlobConnectionString }}
    container_name: my-cd-container
    source_folder: ${{ env.BuildOutputFolder }}
    destination_folder: Distributions/${{ github.run_number }}
    clean_destination_folder: true
    fail_if_source_empty: true
```

## Important Notes

### Environment Variables

If you need to use a environment variable for a `with` input, you must use the `${{ env.Name }}` syntax and **not** `$env:Name`. See [Github Contexts](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#contexts) documentation for more help.

For example:

```yaml
with:
  source_folder: $env:MyVariable # Does NOT work in with assignments.
  source_folder: ${{ env.MyVariable }} # Works.
```
