---
sidebar_position: 4
---

# Deploying Static Assets

The
[Static Assets Deploy action](https://github.com/pagopa/dx/tree/main/actions/static-assets-deploy)
is a utility that simplifies the deployment of static assets to Azure. It
supports both Azure Front Door (default) and Azure CDN Classic, providing the
ability to selectively purge specific paths or perform a full purge of the
cache.

## How It Works

The action performs the following steps:

1. Synchronizes the specified directory with the Azure Blob Storage container.
2. Purges the cache on Azure Front Door (default) or Azure CDN Classic:
   - Optionally purges specific paths if `selective_purge_paths` is provided.
   - If no specific paths are provided, purges the entire cache.

## Usage

To use the Static Assets Deploy action, create a workflow file in your
repository. Below are example configurations for both Azure Front Door and Azure
CDN Classic.

### Using Azure Front Door (Default)

```yaml
name: Deploy Static Assets

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # ...other steps, such as Azure login, can be added here...

      - name: Deploy to Azure Front Door
        uses: pagopa/dx/actions/static-assets-deploy@main
        with:
          storage_account_name: "your-storage-account-name"
          blob_container_name: "your-blob-container-name"
          resource_group_name: "your-resource-group-name"
          profile_name: "your-frontdoor-profile-name"
          endpoint_name: "your-frontdoor-endpoint-name"
          selective_purge_paths: "./path/file1 ./path/file2"
          sync_dir_name: "dist"
          working_directory: "."
```

### Using Azure CDN Classic

```yaml
name: Deploy Static Assets

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # ...other steps, such as Azure login, can be added here...

      - name: Deploy to Azure CDN Classic
        uses: pagopa/dx/actions/static-assets-deploy@main
        with:
          use_cdn_classic: true
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

1. **Service Type** - By default, the action uses Azure Front Door. Set
   `use_cdn_classic: true` to use Azure CDN Classic.
2. **Adjust paths** - Ensure `sync_dir_name` and `working_directory` match your
   project structure.
3. **Selective purge** - Use `selective_purge_paths` to optimize cache purging
   for specific files or directories.
4. **Permissions** - Ensure the Azure CLI is authenticated and has the necessary
   permissions to access the storage account and Front Door/CDN.
