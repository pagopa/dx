---
sidebar_position: 1
sidebar_label: Deploying Assets to CDN
---

# CDN Code Deploy

The [CDN Code Deploy action](https://github.com/pagopa/dx/tree/main/.github/actions/cdn-code-deploy) is a utility that simplifies the deployment of assets to a Content Delivery Network (CDN). It also provides the ability to selectively purge specific paths or perform a full purge of the CDN cache.

## How It Works

The action performs the following steps:

1. Synchronizes the specified directory with the Azure Blob Storage container.
2. Optionally purges specific paths in the CDN cache if `selective_purge_paths` is provided.
3. If no specific paths are provided, purges the entire CDN cache.

## Usage

To use the CDN Code Deploy action, create a workflow file in your repository. Below is an example configuration:

```yaml
name: CDN Code Deploy

on:
  workflow_dispatch:

jobs:
  cdn_deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # ...other steps, such as Azure login, can be added here...

      - name: Deploy to CDN
        uses: pagopa/dx/.github/actions/cdn-code-deploy@main
        with:
          storage_account_name: "your-storage-account-name"
          blob_container_name: "your-blob-container-name"
          resource_group_name: "your-resource-group-name"
          profile_name: "your-cdn-profile-name"
          endpoint_name: "your-cdn-endpoint-name"
          selective_purge_paths: "./path/file1 ./path/file2"
          sync_dir_name: "dist"
          working_directory: "."
```

### Configuration Variables

- **storage_account_name**: The name of the Azure Storage account where the assets will be uploaded. This account must have the necessary permissions to allow blob synchronization.
- **blob_container_name**: The name of the Blob Storage container within the Azure Storage account. This container will store the synchronized assets.
- **resource_group_name**: The name of the Azure resource group containing the CDN.
- **profile_name**: The name of the CDN profile associated with the endpoint.
- **endpoint_name**: The name of the CDN endpoint where the assets will be served..
- **selective_purge_paths**: (Optional) A list of relative paths to purge specific files. Leave empty to purge all files.  
  _Example_: `./path/file1 ./path/file2` or `./path/dir/*` for recursive purging.  
  The format should follow the parameters as described in the [official documentation](https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint?view=azure-cli-latest#az-cdn-endpoint-purge-required-parameters).
- **sync_dir_name**: (Optional) The directory containing the files to sync. Default is `dist`.
- **working_directory**: (Optional) The base directory containing the `sync_dir_name`. Default is `.`.

### Adapting This Workflow

When implementing this action in your repository:

1. **Adjust paths** - Ensure `sync_dir_name` and `working_directory` match your project structure.
2. **Selective purge** - Use `selective_purge_paths` to optimize cache purging for specific files or directories.
3. **Permissions** - Ensure the Azure CLI is authenticated and has the necessary permissions to access the storage account and CDN.

:::warning

Make sure to configure the required Azure credentials in your GitHub repository secrets for secure authentication.

:::
