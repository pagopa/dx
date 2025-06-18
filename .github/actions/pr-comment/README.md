# PR Comment Manager Action

This action creates or updates comments on Pull Requests. It provides a simple way to post comments and optionally update existing ones based on a search pattern.

## Features

- Create new comments on PRs
- Optionally update existing comments using search patterns
- Full markdown support in comments

## Usage

### Post a New Comment
```yaml
- uses: ./.github/actions/pr-comment
  with:
    comment-body: |
      ### Build Results ✅
      Build completed successfully!
```

### Update Existing Comment
```yaml
- uses: ./.github/actions/pr-comment
  with:
    comment-body: |
      ### Test Coverage Report
      \`\`\`json
      ${{ steps.coverage.outputs.report }}
      \`\`\`
    search-pattern: 'Test Coverage Report'  # Will update existing comment if found
```

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `comment-body` | Content of the comment (supports markdown) | Yes |
| `search-pattern` | Text pattern to identify existing comments to replace | No |

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
