# Azure Blob Upload

This GitHub Action a simple and easy way to upload any files to any blob container.

* There are a few samples below to help you get started (under the Examples section).
* To see a real-world production application using this Action, visit [Media File Manager](https://github.com/LanceMcCarthy/MediaFileManager) repository and review [workflow folder's](https://github.com/LanceMcCarthy/MediaFileManager/tree/main/.github/workflows) cd.yml (on [lines 113-120](https://github.com/LanceMcCarthy/MediaFileManager/blob/227d9383cc5761707c8736bd5cbfd3c6bd402ea4/.github/workflows/cd.yml#L113-L120)).

## Inputs

Below are the action's inputs that need to be defined in the Action's `with` block.

| Input (☑️ = required) | Example | Summary |
|--------|--------|--------|
| ☑️ connection_string | `${{ secrets.MyCnnStr }}` | Azure blob conection string |
| ☑️ container_name | `my-container` | Name of the Blob container |
| ☑️ source_folder | `src\BuildOutput\` | Folder with the files to upload |
| destination_folder | `MyTargetFolder/Subfolder` | Folder to upload to in the container (it will be created for you if it does not exist). |
| clean_destination_folder |  **false** (default)| Delete all files in the desintation before uploading the new files. |
| fail_if_source_empty | **false** (default)| If you would prefer this Action to fail the workflow if there are no files to upload. |

**Tip**: If you need to use a environment variable for a `with` input, use the `${{ env.xxx }}` syntax. See [Github Contexts](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#contexts) documentation for more help.

For example:

```yaml
with:
  source_folder: $env:MyVariable # Does NOT work in with assignments.
  source_folder: ${{ env.MyVariable }} # Works.
```

## Examples

If you copy-paste from the examples below, don't forget to use a real version number at the end of action name: `LanceMcCarthy/Action-AzureBlobUpload@v1.3`.

### Bare Minimum

In the most basic form, the Action will upload everything in the `source_folder` to the root of that blob container.

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@vX.X
  name: Uploading to Azure storage...
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
```

### Set a Destination Folder (most common)

If you want to upload the files to a folder in the blob container, you can set a `destination_folder`. If you would like to delete any files in the destination folder before the upload, use `clean_destination_folder`.

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@vX.X
  name: Azure Blob Upload with Destination folder defined
  with:
    connection_string: ${{ secrets.YourAzureBlobConnectionString }}
    container_name: your-container-name
    source_folder: src\LocalFolderName\
    destination_folder: FolderNameInBlob
    clean_destination_folder: true
```

### Advanced

Here is an example that might represent a real-world Workflow.

* The source folder uses an environment variable uses (see [Using Variables in Actions](https://docs.github.com/en/actions/configuring-and-managing-workflows/using-variables-and-secrets-in-a-workflow)).
* The connection string uses a secrets variable. 
* The desination folder combines a name and the run number of the workflow (see [GitHub Context variables](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#github-context)).
* The action will fail and stop the Workflow if there are no files to upload.

```yaml
- uses: LanceMcCarthy/Action-AzureBlobUpload@vX.X
  name: Azure Blob Upload with Destination folder defined
  with:
    connection_string: ${{ secrets.DeploymentsBlobConnectionString }}
    container_name: my-cd-container
    source_folder: ${{ env.BuildOutputFolder }}
    destination_folder: Distributions/${{ github.run_number }}
    clean_destination_folder: true
    fail_if_source_empty: true
```
