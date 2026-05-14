# DX Metrics Portal

A Next.js web application for visualizing GitHub engineering metrics.
Uses PostgreSQL for data storage and Recharts for dashboard visualization.

The GitHub data importer lives in the separate `apps/dx-metrics-import`
workspace app.

## Architecture

- **Next.js 16** (App Router) — frontend dashboards + API routes
- **PostgreSQL 16** — persistent data storage
- **Drizzle ORM** — type-safe database access
- **Recharts** — chart rendering
- **DX Metrics importer** (`apps/dx-metrics-import`) — incremental data sync from GitHub API via Octokit

## Prerequisites

- Docker and Docker Compose

## Setup

1. **Start services:**

```bash
# From the monorepo root
docker compose --profile dx-metrics up -d
```

2. **Apply the shared database schema:**

Follow the Drizzle workflow documented in
[`packages/dx-metrics-core`](../../packages/dx-metrics-core/README.md), where
the shared schema lives.

3. **Populate the database (optional but recommended):**

Follow the importer usage documented in
[`apps/dx-metrics-import`](../dx-metrics-import/README.md).

4. **Access dashboards** at http://localhost:3000 (anonymous access; no GitHub login required)

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

Portal defaults are sourced from the shared `@pagopa/dx-metrics-core`
workspace package, **not** from these environment variables.

Typical configuration fields include:

| Field          | Default                  | Description                                               |
| -------------- | ------------------------ | --------------------------------------------------------- |
| `organization` | `pagopa`                 | GitHub organization                                       |
| `repositories` | (see shared config)      | List of repositories to analyze                           |
| `dxTeamSlug`   | `engineering-team-devex` | GitHub team slug — members are resolved via API at import |
| `dxRepo`       | `dx`                     | The DX repository name                                    |

Importer runtime configuration and GitHub authentication are documented in
[`apps/dx-metrics-import`](../dx-metrics-import/README.md).

## Development

```bash
pnpm install
pnpm dev
```

## Database Connection

Database URL and schema-sync notes are documented in
[`packages/dx-metrics-core`](../../packages/dx-metrics-core/README.md).
