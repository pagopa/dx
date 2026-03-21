# DX Metrics

A Next.js web application for visualizing GitHub engineering metrics.
Uses PostgreSQL for data storage and Recharts for dashboard visualization.

## Architecture

- **Next.js 16** (App Router) — frontend dashboards + API routes
- **PostgreSQL 16** — persistent data storage
- **Drizzle ORM** — type-safe database access
- **Recharts** — chart rendering
- **Import script** — incremental data sync from GitHub API via Octokit

## Prerequisites

- Docker and Docker Compose
- GitHub App credentials or a GitHub PAT with access to the target organization and repositories

## Setup

1. **Start services:**

```bash
# From the monorepo root
docker compose --profile dx-metrics up -d
```

2. **Setup database:**

Only needed on first run, when applying new migrations, or when upgrading an
existing database:

```bash
# From apps/dx-metrics/
DATABASE_URL=postgresql://postgresql:postgresql@172.18.0.1:5432/postgresql npx drizzle-kit push
```

3. **Import data (incremental):**

```bash
export GITHUB_APP_ID=123456
export GITHUB_APP_INSTALLATION_ID=7890123
# Convert PEM file to a single line with \n escapes
export GITHUB_APP_PRIVATE_KEY="$(awk '{printf "%s\\n", $0}' /path/to/github-app-private-key.pem)"
export DATABASE_URL=postgresql://postgresql:postgresql@172.18.0.1:5432/postgresql
npx tsx scripts/import.ts --since 2026-01-01
```

If your secret store exposes the private key with escaped newlines (`\n`),
`dx-metrics` normalizes it automatically before creating the GitHub App
installation client.

If GitHub App credentials are not configured, the import script falls back to
`GITHUB_TOKEN`.

4. **Access dashboards** at http://localhost:3000 (anonymous access; no GitHub login required)

## Import Script

The import script supports incremental data sync from GitHub:

```bash
npx tsx scripts/import.ts --since YYYY-MM-DD [--entity <type>] [--tracker-csv <path>]
```

### Entity types

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

### Tracker CSV Import

```bash
npx tsx scripts/import.ts --since 2024-01-01 --entity tracker --tracker-csv /path/to/tracker.csv
```

## Starting the Application

```bash
chmod +x start.sh
./start.sh
```

## Dashboards

| Dashboard         | Description                                              |
| ----------------- | -------------------------------------------------------- |
| **Pull Requests** | Lead time, merge frequency, PR size, comments            |
| **Workflows**     | Deployment frequency, pipeline failures, duration        |
| **IaC PRs**       | Infrastructure PR lead times, supervised vs unsupervised |
| **DX Adoption**   | DX pipeline and Terraform module adoption                |
| **Techradar**     | Discoverable tool adoption mapped to DX Techradar        |
| **DX Team**       | Team commits across repositories                         |
| **Tracker**       | DX request tracking and trends                           |

## Configuration

Application configuration is loaded at runtime from the configuration file
(for example via `src/lib/config.ts` reading `config.json`), **not** from
these environment variables.

Typical configuration fields include:

| Field          | Default          | Description                                               |
| -------------- | ---------------- | --------------------------------------------------------- |
| `organization` | `pagopa`         | GitHub organization                                       |
| `repositories` | (see config)     | List of repositories to analyze                           |
| `dxTeamSlug`   | `engineering-dx` | GitHub team slug — members are resolved via API at import |
| `dxRepo`       | `dx`             | The DX repository name                                    |

Refer to the `config.json` used by `src/lib/config.ts` for the exact
structure and values.

### Import authentication variables

The import script authenticates to GitHub with this precedence:

1. GitHub App installation auth, when all GitHub App variables are configured
2. `GITHUB_TOKEN`, when GitHub App credentials are absent

GitHub App variables:

| Variable                     | Description                                |
| ---------------------------- | ------------------------------------------ |
| `GITHUB_APP_ID`              | Numeric GitHub App ID                      |
| `GITHUB_APP_INSTALLATION_ID` | Numeric installation ID for the target org |
| `GITHUB_APP_PRIVATE_KEY`     | GitHub App private key in PEM format       |

Fallback variable:

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `GITHUB_TOKEN` | GitHub personal access token |

## Development

```bash
pnpm install
pnpm dev
```

## Database Connection

When running outside Docker Compose (e.g., in development), the database URL needs to point to the Docker network gateway:

```bash
DATABASE_URL=postgresql://postgresql:postgresql@172.18.0.1:5432/postgresql
```

To find the correct IP, inspect the Docker network:

```bash
docker network inspect dx-metrics_default
```

Look for the "Gateway" IP in the network config (usually 172.18.0.1 for the default bridge network).
