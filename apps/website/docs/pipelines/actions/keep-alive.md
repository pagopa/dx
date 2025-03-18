---
sidebar_position: 1
sidebar_label: Keep Alive
---

# Keep Alive Action

The [Keep Alive action](https://github.com/pagopa/dx/tree/main/.github/actions/keep-alive) is a utility that prevents GitHub repositories from becoming inactive by creating an empty commit and pushing it to the repository. This is particularly useful for maintaining GitHub Actions with scheduled triggers, which GitHub automatically disables after 60 days of repository inactivity.

## How It Works

The action performs these steps:

1. Checks out the repository
2. Configures a local git user as _"Keepalive"_
3. Creates an empty commit with the message _"Keeping the repository alive"_
4. Pushes the commit to the repository

## Usage

This action is typically used within a scheduled workflow. Here's an example of how to use it:

```yaml
steps:
  - name: Keep Repository Active
    uses: pagopa/dx/.github/actions/keep-alive@main
```

### Permissions Required

This action requires write permissions to the repository contents to be able to push commits.

### Implementation Details

The Keep Alive action is implemented as a composite action that uses Bash commands to make an empty commit. If there are no changes to commit (meaning another process has already made a commit), the action will exit gracefully without failing.

## See Also

For more information on how this action is used in a workflow context, see the [Keep Alive Workflow documentation](../workflows/keep-alive.md).
