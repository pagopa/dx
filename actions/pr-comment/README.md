# PR Comment Manager Action

A TypeScript-based GitHub Action that creates or updates comments on Pull Requests. It provides a simple way to post comments and optionally update existing ones in place based on a search pattern.

## Features

- ✅ Create new comments on PRs
- 🔄 Optionally update existing comments in place using search patterns
- 📝 Full markdown support in comments
- 📁 Support for both direct content and file-based content
- 🎯 TypeScript implementation for better maintainability
- 🛡️ Robust error handling and logging

## Usage

### Post a New Comment Using Direct Content

```yaml
- uses: pagopa/dx/actions/pr-comment@main
  with:
    comment-body: |
      ### Build Results ✅
      Build completed successfully!
```

### Post a New Comment Using Content from File

```yaml
- uses: pagopa/dx/actions/pr-comment@main
  with:
    comment-body-file: path/to/build-report.md
```

### Update Existing Comment

```yaml
- uses: pagopa/dx/actions/pr-comment@main
  with:
    comment-body: |
      ### Test Coverage Report
      \`\`\`json
      ${{ steps.coverage.outputs.report }}
      \`\`\`
    search-pattern: "Test Coverage Report" # Will update existing comment if found
```

### Update Existing Comment Using File Content

```yaml
- uses: pagopa/dx/actions/pr-comment@main
  with:
    comment-body-file: coverage-report.md
    search-pattern: "Test Coverage Report" # Will update existing comment if found
```

### Custom GitHub Token

```yaml
- uses: pagopa/dx/actions/pr-comment@main
  with:
    comment-body: "Custom comment"
    github-token: ${{ secrets.CUSTOM_GITHUB_TOKEN }}
```

## Inputs

| Input               | Description                                                                                                       | Required | Default               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- | --------------------- |
| `comment-body`      | Content of the comment (supports markdown). Either this or `comment-body-file` must be provided                   | No       | -                     |
| `comment-body-file` | Path to a file containing the comment content (supports markdown). Either this or `comment-body` must be provided | No       | -                     |
| `search-pattern`    | Text pattern to identify an existing comment to update                                                            | No       | -                     |
| `github-token`      | GitHub token for API access                                                                                       | No       | `${{ github.token }}` |

> **Note**: You must provide either `comment-body` or `comment-body-file`. If both are provided, `comment-body` takes precedence.

## Outputs

| Output        | Description                               |
| ------------- | ----------------------------------------- |
| `comment-id`  | The ID of the created or updated comment  |
| `comment-url` | The URL of the created or updated comment |

## Example Use Cases

### Terraform Plan

```yaml
- uses: pagopa/dx/actions/pr-comment@main
  with:
    comment-body: |
      ### 📖 Terraform Plan (${{ steps.directory.outputs.dir }}) - ${{ steps.plan.outcome }}
      <details>
      <summary>Show Plan</summary>

      \`\`\`hcl
      ${{ steps.plan.outputs.stdout }}
      \`\`\`
      </details>
    search-pattern: "Terraform Plan (${{ steps.directory.outputs.dir }})"
```

### Test Results with File

```yaml
- name: Generate test report
  run: npm test -- --reporter=json > test-results.json

- uses: pagopa/dx/actions/pr-comment@main
  with:
    comment-body-file: test-results.json
    search-pattern: "Test Results"
```

### Build Status Update

```yaml
- uses: pagopa/dx/actions/pr-comment@main
  id: comment
  with:
    comment-body: |
      ### 🚀 Deployment Status: ${{ job.status }}

      **Branch:** `${{ github.head_ref }}`
      **Commit:** ${{ github.sha }}
      **Run:** [#${{ github.run_number }}](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
    search-pattern: "Deployment Status"

- name: Use comment outputs
  run: |
    echo "Comment ID: ${{ steps.comment.outputs.comment-id }}"
    echo "Comment URL: ${{ steps.comment.outputs.comment-url }}"
```

## Development

This action is written in TypeScript and uses the following key dependencies:

- `@actions/core` - GitHub Actions toolkit core
- `@actions/github` - GitHub API client for Actions

### Building

```bash
# Install dependencies
pnpm install

# Build the action
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

### Local Development

The action is part of the PagoPA DX monorepo and follows the established patterns for TypeScript projects.

## Migration from YAML Version

This TypeScript version replaces the previous YAML-based implementation with the following improvements:

- ✅ Better error handling and validation
- ✅ Structured logging with `@actions/core`
- ✅ Type safety with TypeScript
- ✅ Action outputs for comment ID and URL
- ✅ More robust pattern matching
- ✅ Existing comments are updated in place instead of being deleted and recreated
- ✅ Better documentation and maintainability

## Maintainers

This action is maintained by the [PagoPA DX](https://dx.pagopa.it/docs/) team.
