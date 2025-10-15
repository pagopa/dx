---
sidebar_position: 50
---

# Keeping Scheduled GitHub Actions Alive

The
[Keep Alive action](https://github.com/pagopa/dx/tree/main/actions/keep-alive)
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

      # Use the Keep Alive action when needed
      - name: Keep Alive
        uses: pagopa/dx/.github/actions/keep-alive@main
        with:
          bot_token: ${{ secrets.GITHUB_BOT_TOKEN }}
```

### Adapting This Workflow

When implementing this pattern in your own repositories:

1. **Consider the schedule** - The daily check frequency can be adjusted
2. **Configure the secret** - Create a personal access token with repository
   `Contents` **Read & Write** permissions and store it as a repository secret
   (e.g., `GITHUB_BOT_TOKEN`)
3. **Ensure proper permissions**:
   - The workflow requires `contents: write` to push commits
   - Enable `Read and Write permissions` for workflows inside repository
     settings
   - If your repository uses branch protection with required pull requests,
     configure _"Allow specified actors to bypass required pull requests"_ by
     adding the GitHub account that corresponds to the token passed to the
     action

:::note

The action uses `GITHUB_TOKEN` to make empty commits to the repository. It's
recommended to create a Personal Access Token (PAT) using a bot account (such as
`dx-pagopa-bot`) and add it as a secret to pass to the action. Note that the
chosen bot account must be added to the list of pull request bypassers
![GitHub Branch Protection](./branch-protection.png) otherwise, it won't be able
If the bot account is not visible in the list of bypasses, ensure it has been
added as a collaborator to the repository.

:::
