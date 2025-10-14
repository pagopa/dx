# Keep Alive GitHub Action

This GitHub Action ensures that a repository remains active by making an empty commit if no commits have been made in the last 55 days. This can be useful for keeping repositories from being marked as inactive.

## Features

- Automatically calculates the number of days since the last commit.
- Makes an empty commit if 55 days have passed.
- Allows manual bypass to force the action to run.

## Inputs

| Name    | Description                                      | Required | Default |
|---------|--------------------------------------------------|----------|---------|
| bypass  | Force the action to run regardless of conditions | false    | false   |

## Example Usage

```yaml
name: Keep Repository Alive

on:
  schedule:
    - cron: "0 0 * * *" # Runs daily

jobs:
  keep-alive:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run Keep Alive Action
        uses: pagopa/dx/actions/keep-alive@main
```

## Notes

- Ensure that the GitHub token used has write permissions to the repository.
- The action will log the number of days since the last commit and whether an empty commit was made.
