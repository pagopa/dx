# PR Comment Manager Action

This action creates or updates comments on Pull Requests. It provides a simple way to post comments and optionally update existing ones based on a search pattern.

## Features

- Create new comments on PRs
- Optionally update existing comments using search patterns
- Full markdown support in comments
- Support for both direct content and file-based content

## Usage

### Post a New Comment Using Direct Content

```yaml
- uses: pagopa/dx/.github/actions/pr-comment@main
  with:
    comment-body: |
      ### Build Results ✅
      Build completed successfully!
```

### Post a New Comment Using Content from File

```yaml
- uses: pagopa/dx/.github/actions/pr-comment@main
  with:
    comment-body-file: path/to/build-report.md
```

### Update Existing Comment

```yaml
- uses: pagopa/dx/.github/actions/pr-comment@main
  with:
    # Using direct content
    comment-body: |
      ### Test Coverage Report
      \`\`\`json
      ${{ steps.coverage.outputs.report }}
      \`\`\`
    search-pattern: "Test Coverage Report" # Will update existing comment if found
```

### Update Existing Comment Using File Content

```yaml
# OR using file content
- uses: pagopa/dx/.github/actions/pr-comment@main
  with:
    comment-body-file: coverage-report.md
    search-pattern: "Test Coverage Report" # Will update existing comment if found
```

## Inputs

| Input               | Description                                                                                                       | Required |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| `comment-body`      | Content of the comment (supports markdown). Either this or `comment-body-file` must be provided                   | No       |
| `comment-body-file` | Path to a file containing the comment content (supports markdown). Either this or `comment-body` must be provided | No       |
| `search-pattern`    | Text pattern to identify existing comments to replace                                                             | No       |

> **Note**: You must provide either `comment-body` or `comment-body-file`. If both are provided, `comment-body` takes precedence.

## Example Use Cases

### Terraform Plan

```yaml
- uses: ./.github/actions/pr-comment
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

## Maintainers

This action is maintained by the [PagoPA DX](https://pagopa.github.io/dx/docs/) team.
```
