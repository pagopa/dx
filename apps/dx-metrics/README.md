# DX Metrics

A Next.js web application for visualizing GitHub engineering metrics.
Uses PostgreSQL for data storage and Recharts for dashboard visualization.

## Architecture

- **Next.js 16** (App Router) — frontend dashboards + API routes
- **PostgreSQL 16** — persistent data storage
- **Drizzle ORM** — type-safe database access
- **Recharts** — chart rendering
- **Better Auth** — GitHub OAuth authentication
- **Import script** — incremental data sync from GitHub API via Octokit

## Prerequisites

- Docker and Docker Compose
- A GitHub personal access token with `repo` scope
- A GitHub OAuth App (for dashboard authentication)

## Quick Start

1. **Copy environment file:**

```bash
cp .env.example .env
```

2. **Edit `.env`** with your values:
   - `GITHUB_TOKEN` — GitHub personal access token
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — GitHub OAuth App credentials
   - `BETTER_AUTH_SECRET` — random secret used by Better Auth for session/token encryption
   - `BETTER_AUTH_URL` — application URL used by Better Auth (e.g. `http://localhost:3000`)
3. **Start services:**

```bash
docker compose up -d
```

4. **Run database migrations:**

```bash
DATABASE_URL=postgresql://dxmetrics:dxmetrics@172.18.0.1:5432/dxmetrics npx drizzle-kit migrate
```

5. **Import data (incremental):**

```bash
export GITHUB_TOKEN=ghp_XXX
export DATABASE_URL=postgresql://dxmetrics:dxmetrics@172.18.0.1:5432/dxmetrics
npx tsx scripts/import.ts --since 2026-01-01
```

6. **Access dashboards** at http://localhost:3000

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

## Development

```bash
pnpm install
pnpm dev
```

## Database Connection

When running outside Docker Compose (e.g., in development), the database URL needs to point to the Docker network gateway:

```bash
DATABASE_URL=postgresql://dxmetrics:dxmetrics@172.18.0.1:5432/dxmetrics
```

To find the correct IP, inspect the Docker network:

```bash
docker network inspect dx-metrics_default
```

Look for the "Gateway" IP in the network config (usually 172.18.0.1 for the default bridge network).
