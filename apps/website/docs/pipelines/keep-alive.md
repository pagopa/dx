---
sidebar_position: 50
---

# Maintaining Scheduled GitHub Actions Alive

The
[Keep Alive action](https://github.com/pagopa/dx/tree/main/.github/actions/keep-alive)
is a utility that prevents GitHub repositories from becoming inactive by
creating an empty commit and pushing it to the repository. This is particularly
useful for maintaining GitHub Actions with scheduled triggers, which GitHub
automatically disables after
[60 days](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow)
of repository inactivity.

## How It Works

The action performs these steps:

1. Checks out the repository
2. Configures a local git user as _"Keepalive"_
3. Creates an empty commit with the message _"Keeping the repository alive"_
4. Pushes the commit to the repository

## Usage

The most effective way to implement the Keep Alive pattern is by creating a
scheduled workflow that:

1. Runs on a regular schedule (e.g., daily)
2. Checks how much time has passed since the last commit
3. Invoke the `Keep Alive` action and creates an empty commit only when
   necessary (approaching the 60-day limit)

### Implementation Example

Here is a complete example of a Keep Alive workflow:

```yaml
name: Keep Alive
on:
  workflow_dispatch:
  schedule:
    - cron: "0 0 * * *" # Run at 00:00 every day

jobs:
  keep_alive:
    runs-on: "ubuntu-latest"
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

1. **Adjust the threshold** - The 55-day threshold can be modified based on your
   specific needs
2. **Consider the schedule** - The daily check frequency can be adjusted
3. **Ensure proper permissions**:
   - The workflow requires `contents: write` to push commits
   - Enable `Read and Write permissions` for workflows inside repository
     settings
