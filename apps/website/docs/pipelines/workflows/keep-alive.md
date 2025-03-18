---
sidebar_position: 1
sidebar_label: Keep Alive repositories
---

# Keep Alive Workflow

GitHub [automatically disables scheduled workflows](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow) in repositories that have been inactive for 60 days. This workflow demonstrates a practical implementation of the [Keep Alive action](../actions/keep-alive.md) to prevent this issue by detecting repository inactivity and creating an empty commit when necessary.

## Usage

This workflow serves as a reference implementation showing how to effectively use the Keep Alive action in your own repositories. It demonstrates:

- How to schedule regular checks for repository activity
- How to determine when a repository is approaching the inactivity threshold
- How to conditionally invoke the Keep Alive action

### How It Works

The Keep Alive workflow:

1. Runs daily at midnight (or can be triggered manually)
2. Calculates the number of days since the last commit
3. If 55 or more days have passed since the last commit, the workflow uses the [Keep Alive action](../actions/keep-alive.md) to create and push an empty commit

By creating a commit before reaching the 60-day threshold, the workflow ensures that GitHub never disables the scheduled actions in the repository.

### Implementation Example

Here's how the workflow is implemented:

```yaml
name: Keep Alive
on:
  workflow_dispatch:
  schedule:
    - cron: '0 0 * * *' # Run at 00:00 every day

jobs:
  keep_alive:
    runs-on: 'ubuntu-latest'
    permissions:
      contents: write
      actions: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Calculate days since last commit
        id: commit_date
        run: |
          # Calculate days since last activity
          LAST_COMMIT_DATE=$(git log -1 --format=%ct)
          CURRENT_DATE=$(date +%s)
          DIFFERENCE=$(( ($CURRENT_DATE - $LAST_COMMIT_DATE) / 86400 ))
          echo "days_since_commit=$DIFFERENCE" >> $GITHUB_ENV

      # Use the Keep Alive action when needed
      - name: Keep Alive
        if: env.days_since_commit >= '55'
        uses: pagopa/dx/.github/actions/keep-alive@main
```

### Adapting This Workflow

When implementing this pattern in your own repositories:

1. **Adjust the threshold** - The 55-day threshold can be modified based on your specific needs
2. **Consider the schedule** - The daily check frequency can be adjusted
3. **Ensure proper permissions**:
   - The workflow requires `contents: write` to push commits
   - Enable `Read and Write permissions` for workflows inside repository settings

## See Also

- For more information about the action used by this workflow, see the [Keep Alive Action documentation](../actions/keep-alive.md).
- To view the workflow in the DX repository, visit the [Keep Alive Workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/keep_alive.yml).
