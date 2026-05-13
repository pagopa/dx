# DX Metrics Importer

The DX Metrics importer synchronizes GitHub engineering data into the PostgreSQL
database used by the DX Metrics portal.

## Setup

1. **Start local services:**

```bash
# From the monorepo root
docker compose --profile dx-metrics up -d
```

2. **Apply the shared schema:**

Follow the Drizzle workflow documented in
[`packages/dx-metrics-core`](../../packages/dx-metrics-core/README.md).

3. **Run an incremental import:**

```bash
cd apps/dx-metrics-import
export GITHUB_CLIENT_ID=Iv1.0123456789abcdef
export GITHUB_APP_INSTALLATION_ID=7890123
export GITHUB_APP_PRIVATE_KEY="$(awk '{printf "%s\\n", $0}' /path/to/github-app-private-key.pem)"
export DATABASE_URL=postgresql://postgresql:postgresql@172.18.0.1:5432/postgresql
pnpm import -- --since 2026-01-01
```

## Configuration

By default, the importer uses the shared DX Metrics defaults from
`@pagopa/dx-metrics-core`. To override them, pass a JSON file:

```bash
pnpm import -- --config ./config.json --since 2026-01-01
```

## Entity types

- `all` (default) — import everything
- `pull-requests` — pull requests per repository
- `workflows` — GitHub Actions workflows
- `workflow-runs` — workflow run history
- `iac-pr` — IaC pull request lead times
- `commits` — DX team member commits
- `code-search` — code search results for DX adoption
- `tech-radar` — discoverable tool usage mapped to DX Techradar
- `terraform-registry` — Terraform registry releases
- `tracker` — DX request tracker (from Slack CSV)

### Tracker CSV import

```bash
pnpm import -- --since 2024-01-01 --entity tracker --tracker-csv /path/to/tracker.csv
```

## GitHub authentication

The import script authenticates to GitHub with this precedence:

1. GitHub App installation auth with `GITHUB_CLIENT_ID`, when `GITHUB_CLIENT_ID`,
   `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY` are configured
   - `dx-metrics-import` uses the App credentials directly for Octokit and mints a
     temporary installation token for `terrawiz`
2. GitHub App installation auth with `GITHUB_APP_ID`, when `GITHUB_CLIENT_ID` is
   absent and `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and
   `GITHUB_APP_PRIVATE_KEY` are configured
3. `GITHUB_TOKEN`, when GitHub App credentials are absent

If your secret store exposes the private key with escaped newlines (`\n`),
`dx-metrics-import` normalizes it automatically before creating the GitHub App
installation client.

When GitHub App credentials are configured, `dx-metrics-import` also generates a
short-lived installation access token right before invoking `terrawiz`, so the
Terraform module import does not require a separate `GITHUB_TOKEN`.

If GitHub App credentials are not configured, the importer falls back to
`GITHUB_TOKEN` for both Octokit and `terrawiz`.

### GitHub App variables

| Variable                     | Description                                |
| ---------------------------- | ------------------------------------------ |
| `GITHUB_CLIENT_ID`           | Preferred GitHub App client ID             |
| `GITHUB_APP_ID`              | Fallback numeric GitHub App ID             |
| `GITHUB_APP_INSTALLATION_ID` | Numeric installation ID for the target org |
| `GITHUB_APP_PRIVATE_KEY`     | GitHub App private key in PEM format       |

### Fallback variable

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `GITHUB_TOKEN` | GitHub personal access token |
