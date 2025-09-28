---
sidebar_position: 50
---

# Deploying Assets to a CDN

The
[CDN Code Deploy action](https://github.com/pagopa/dx/tree/main/.github/actions/cdn-code-deploy)
is a utility that simplifies the deployment of assets to a Content Delivery
Network (CDN). It also provides the ability to selectively purge specific paths
or perform a full purge of the CDN cache.

## How It Works

The action performs the following steps:

1. Synchronizes the specified directory with the Azure Blob Storage container.
2. Optionally purges specific paths in the CDN cache if `selective_purge_paths`
   is provided.
3. If no specific paths are provided, purges the entire CDN cache.

## Usage

To use the CDN Code Deploy action, create a workflow file in your repository.
Below is an example configuration:

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

When implementing this action in your repository:

1. **Adjust paths** - Ensure `sync_dir_name` and `working_directory` match your
   project structure.
2. **Selective purge** - Use `selective_purge_paths` to optimize cache purging
   for specific files or directories.
3. **Permissions** - Ensure the Azure CLI is authenticated and has the necessary
   permissions to access the storage account and CDN.
