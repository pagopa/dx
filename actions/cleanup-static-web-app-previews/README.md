# Cleanup Static Web App Previews

Delete previews associated with closed or merged pull requests, preserving previews
for open PRs, production, and named environments.

## Requirements

- An existing Azure CLI login with permission to read the Static Web App and list
  and delete its builds (`Microsoft.Web/staticSites/read`,
  `Microsoft.Web/staticSites/builds/read`, and
  `Microsoft.Web/staticSites/builds/delete`).
- A GitHub token with `pull-requests: read` on the calling repository.
- Azure CLI, GitHub CLI, jq, and Bash installed on the runner.
- The Static Web App's PR previews must belong exclusively to the calling
  repository: numeric build IDs are interpreted as its PR numbers.

The action fails on Azure or GitHub API errors rather than assuming a PR is closed.
It does not require checking out the DX repository.

## Usage

After logging in to Azure:

```yaml
- uses: pagopa/dx/actions/cleanup-static-web-app-previews@main
  with:
    static_web_app_name: my-static-web-app
    resource_group_name: my-resource-group
```

`github_token` defaults to `${{ github.token }}`.
