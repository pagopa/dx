# Migration Guide: PR Comment Action

## Overview

The PR Comment Action has been refactored from a YAML composite action to a TypeScript-based action for better maintainability, error handling, and functionality.

## What Changed

### Location

- **Old**: `.github/actions/pr-comment/`
- **New**: `actions/pr-comment/`

### Implementation

- **Old**: YAML composite action using `actions/github-script`
- **New**: TypeScript action using `@actions/core` and `@actions/github`

### Usage in Workflows

- **Old**: `uses: pagopa/dx/.github/actions/pr-comment@main`
- **New**: `uses: ./actions/pr-comment`

## Benefits of the New Implementation

1. **Better Error Handling**: Structured error handling with clear error messages
2. **Type Safety**: Full TypeScript implementation with type checking
3. **Action Outputs**: New outputs for `comment-id` and `comment-url`
4. **Improved Logging**: Better logging using `@actions/core`
5. **Maintainability**: Easier to test, debug, and extend
6. **Modern Tooling**: Uses modern build tools (tsup, TypeScript, etc.)

## Updated Workflows

The following workflows have been updated to use the new action:

- `.github/workflows/static_analysis.yaml`
- `.github/workflows/infra_plan.yaml`

## Backward Compatibility

The new action maintains the same input interface as the old one:

- `comment-body` - Direct comment content
- `comment-body-file` - Path to file containing comment content
- `search-pattern` - Pattern to identify existing comments to replace

### New Input

- `github-token` - GitHub token for API access (defaults to `${{ github.token }}`)

### New Outputs

- `comment-id` - The ID of the created comment
- `comment-url` - The URL of the created comment

## Example Migration

### Before

```yaml
- uses: pagopa/dx/.github/actions/pr-comment@main
  with:
    comment-body: "My comment"
    search-pattern: "Build Results"
```

### After

```yaml
- uses: ./actions/pr-comment
  with:
    comment-body: "My comment"
    search-pattern: "Build Results"
```

## Old Action Backup

The old action has been moved to `.github/actions/pr-comment-old` for reference and can be removed after confirming the new implementation works correctly.
