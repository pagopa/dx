# Static Assets Deploy

A GitHub Action to deploy static assets to Azure Storage and invalidate cache on Azure Front Door or Azure CDN Classic.

## Description

This action streamlines the deployment of static assets (like frontend applications) to Azure by:

1. Syncing files to Azure Blob Storage
2. Purging the cache on Azure Front Door (default) or Azure CDN Classic

The action is designed to be flexible and supports both modern Azure Front Door and legacy Azure CDN Classic deployments.

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `use_cdn_classic` | Set to `true` to use Azure CDN Classic instead of Front Door | No | `false` |
| `storage_account_name` | Azure Storage account name where the assets will be uploaded | Yes | - |
| `blob_container_name` | Blob container name within the Azure Storage account | Yes | - |
| `resource_group_name` | Resource group name | Yes | - |
| `profile_name` | Profile name associated with the endpoint | Yes | - |
| `endpoint_name` | Endpoint name where the assets will be served | Yes | - |
| `selective_purge_paths` | List of relative paths for files to include in the purge. Leave empty to purge all files | No | - |
| `sync_dir_name` | Path to the files directory | No | `dist` |
| `working_directory` | The path of the directory containing the folder to be synchronized | No | `.` |

### Selective Purge Paths

The `selective_purge_paths` input allows you to specify which files should be purged from the cache. This can speed up deployments when you only need to invalidate specific files.

**Format:**

- Paths should be relative to the synchronized directory (`sync_dir_name`)
- Separate multiple paths with spaces
- Use `/*` pattern to recursively purge an entire directory

**Examples:**

- `"./path/file1 ./path/file2"` - Purge specific files
- `"./assets/*"` - Purge all files in the assets directory
- Leave empty (`""`) - Purge all files (`/*`)

**Documentation:**

- [Azure CDN Classic purge parameters](https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint?view=azure-cli-latest#az-cdn-endpoint-purge-required-parameters)
- [Azure Front Door purge parameters](https://learn.microsoft.com/en-us/cli/azure/afd/endpoint?view=azure-cli-latest#az-afd-endpoint-purge-required-parameters)

## Usage

### Basic Usage (Azure Front Door)

```yaml
- name: Deploy static assets
  uses: pagopa/dx/actions/static-assets-deploy@main
  with:
    storage_account_name: mystorageaccount
    blob_container_name: $web
    resource_group_name: my-resource-group
    profile_name: my-frontdoor-profile
    endpoint_name: my-endpoint
```

### Using Azure CDN Classic

```yaml
- name: Deploy static assets
  uses: pagopa/dx/actions/static-assets-deploy@main
  with:
    use_cdn_classic: true
    storage_account_name: mystorageaccount
    blob_container_name: $web
    resource_group_name: my-resource-group
    profile_name: my-cdn-profile
    endpoint_name: my-cdn-endpoint
```

### Custom Directory and Selective Purge

```yaml
- name: Deploy static assets
  uses: pagopa/dx/actions/static-assets-deploy@main
  with:
    storage_account_name: mystorageaccount
    blob_container_name: $web
    resource_group_name: my-resource-group
    profile_name: my-frontdoor-profile
    endpoint_name: my-endpoint
    sync_dir_name: build
    working_directory: ./packages/frontend
    selective_purge_paths: "./index.html ./assets/*"
```

## Complete Workflow Example

```yaml
name: Deploy Frontend

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # ...other steps, such as Node Setup, Build and Azure login, can be added here...

      - name: Deploy to Azure
        uses: pagopa/dx/actions/static-assets-deploy@main
        with:
          storage_account_name: ${{ secrets.STORAGE_ACCOUNT_NAME }}
          blob_container_name: $web
          resource_group_name: ${{ secrets.RESOURCE_GROUP_NAME }}
          profile_name: ${{ secrets.FRONTDOOR_PROFILE_NAME }}
          endpoint_name: ${{ secrets.FRONTDOOR_ENDPOINT_NAME }}
          sync_dir_name: dist
```

## Prerequisites

- The specified Azure Storage account, container, and Front Door/CDN endpoint must exist
- Appropriate permissions to write to storage and purge the endpoint

## How It Works

1. **Sync Storage**: Uses `az storage blob sync` to upload files from the specified directory to Azure Blob Storage
2. **Purge Cache**: Depending on the `use_cdn_classic` flag, it either:
   - Calls `az afd endpoint purge` for Azure Front Door (default)
   - Calls `az cdn endpoint purge` for Azure CDN Classic

The purge step automatically handles both selective purging (when paths are specified) and full purging (when no paths are specified).

## Notes

- By default, the action uses **Azure Front Door** as it's the newer and recommended service
- Set `use_cdn_classic: true` only if you're still using the legacy Azure CDN Classic service
- The storage sync operation uploads new files and updates changed files, but doesn't delete files that no longer exist in the source
- Purging the cache ensures users see the latest version of your assets immediately after deployment
