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
pnpm run import -- --since 2026-01-01
```

## Configuration

By default, the importer uses the shared DX Metrics defaults from
`@pagopa/dx-metrics-core`. To override them, pass a JSON file:

```bash
pnpm run import -- --config ./config.json --since 2026-01-01
```

## Incremental imports

The importer is incremental by default. For each entity and repository it
records, in `sync_runs.cursor_at`, the time up to which it has imported, and the
next run resumes from there — minus `IMPORT_OVERLAP_DAYS` (default `2`), a safety
margin that catches rows updated just after the previous run — instead of
re-downloading the whole window. `--since` (or `IMPORT_SINCE_DAYS`) is only the
**floor**, used when an entity/repository has no history yet.

Adding a repository to the config therefore backfills just that repository:

```bash
pnpm run import -- --since 2024-01-01 --repo new-repo
```

Repositories already imported resume from their cursor and are not re-downloaded.
`--force` disables cursors and checkpoints, re-reading the whole `--since` window
for every entity/repository.

Because organization-wide entities are not repository-scoped, a `--repo` run
skips them (DX team commits, code search, DX pipelines, terraform registry,
tracker and the techradar snapshot) instead of touching unrelated datasets.

The cursor only advances when an entity processed its whole window. When an
importer cannot fetch everything (a recoverable GitHub failure that is not a
deleted resource), it fails the run instead of silently skipping the item, so the
cursor stays put and the interval is retried on the next run. `workflow-runs`
additionally reconciles runs that are still active, since a run created before
the window can stay in progress (for example while waiting for an environment
approval) after the window has moved past it.

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
pnpm run import -- --since 2024-01-01 --entity tracker --tracker-csv /path/to/tracker.csv
```

## Backfilling a new column

The scheduled import is incremental: it resumes from the per-entity,
per-repository cursor and only re-fetches what changed since the last successful
run. It therefore cannot populate a **newly added** column on older rows, which
then read as blank. When a column the portal charts is added (for example
`workflow_runs.event` or `workflow_runs.triggering_actor`), apply the schema and
then run a one-off import with `--force` and a `since` wide enough to cover the
history you care about:

```bash
cd apps/dx-metrics-import
pnpm run import -- --entity workflow-runs --since 2024-01-01 --force
```

`--force` ignores the cursor and re-reads the whole `--since` window. Without
`--force`, an entity/repository that already completed within the last 23 hours is
skipped. Until the backfill runs, the trigger charts on the portal exclude the
blank rows and report the excluded share in their caption.

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
