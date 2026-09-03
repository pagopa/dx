---
csp-login: major
---

Expose the GitHub App token as an explicit `github_app_token` output instead of
exporting it as a job-wide `GITHUB_TOKEN` from the `Export Logged CSP` step.

## Migration guide

Read the token from the `github_app_token` output and pass it only to the steps
that require GitHub App access:

```yaml
- name: Cloud Login
  id: cloud-login
  uses: pagopa/dx/actions/csp-login@main
  env:
    GH_APP_CLIENT_ID: ${{ secrets.GH_APP_CLIENT_ID }}
    GH_APP_KEY: ${{ secrets.GH_APP_KEY }}
    GH_APP_INSTALLATION_ID: ${{ secrets.GH_APP_INSTALLATION_ID }}

- name: Run GitHub command
  env:
    GITHUB_TOKEN: ${{ steps.cloud-login.outputs.github_app_token }}
  run: gh api user
```

Steps that previously relied on the exported `GITHUB_TOKEN` must now read the
`github_app_token` output explicitly. Secrets can be scoped to the login step so
the App private key is visible only to `csp-login`.
