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

4. **Access dashboards** at http://localhost:3000. Every visitor needs a magic
   link carrying their repository scope; see
   [Repository scopes](#repository-scopes).

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
| **DX Team**       | Team commits across repositories, DX module adoption     |
| **Copilot**       | Copilot review, agent PRs and co-authored commits        |
| **Tracker**       | DX request tracking and trends                           |

## Time range

Every time-windowed dashboard reads an explicit calendar range from the URL
(`?start=2026-06-01&end=2026-11-02`). Both ends are clamped to the data the
portal has imported: `start` cannot precede the first imported data point and
`end` cannot follow the last one. A range shorter than 240 days is charted by
day, longer ranges by week.

The legacy `?days=120` parameter still works: it resolves to the 120 days that
end at the latest imported data point, which is no longer the same as "today"
when the importer lags behind.

## Configuration

Portal defaults are sourced from the shared `@pagopa/dx-metrics-core`
workspace package, **not** from these environment variables.

Typical configuration fields include:

| Field          | Default                  | Description                                               |
| -------------- | ------------------------ | --------------------------------------------------------- |
| `organization` | `pagopa`                 | GitHub organization                                       |
| `repositories` | (see shared config)      | Repositories to analyze, each with its visibility tags    |
| `dxTeamSlug`   | `engineering-team-devex` | GitHub team slug — members are resolved via API at import |
| `dxRepo`       | `dx`                     | The DX repository name                                    |

Importer runtime configuration and GitHub authentication are documented in
[`apps/dx-metrics-import`](../dx-metrics-import/README.md).

## Repository scopes

A visitor sees only the repositories their magic link grants. Links are signed
and carry tags, not repository names, so editing a tag changes what every
existing link sees. The rationale is in
[`docs/adr/0001-repository-scopes.md`](docs/adr/0001-repository-scopes.md).

Only public repositories are configured: a link grants no GitHub permission, so
a private repository would be published to people who cannot open it.

Mint a link with the signing secret in the environment:

```bash
pnpm --filter dx-metrics scope:link --tags p4pa
pnpm --filter dx-metrics scope:link --all
```

`DX_METRICS_SCOPE_SECRET` is required in every environment, and the portal
serves nothing until it holds a real value. Rotating it invalidates every link
in circulation.

## Development

```bash
pnpm install
pnpm dev
```

The portal serves no data without a scope, so local development needs a secret
and a link:

```bash
# Any 32+ character secret: local links only have to match this process.
export DX_METRICS_SCOPE_SECRET="$(openssl rand -base64 32)"
pnpm dev

# In another shell, with the same secret:
pnpm --filter dx-metrics scope:link --tags dx --base-url http://localhost:3000
```

Opening the printed URL sets the scope cookie and redirects to the overview.
Without it, every page lands on `/access`.

## Database Connection

Database URL and schema-sync notes are documented in
[`packages/dx-metrics-core`](../../packages/dx-metrics-core/README.md).
