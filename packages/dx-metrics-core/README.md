# DX Metrics Core

Shared configuration defaults, Drizzle schema, and database contracts used by
both the DX Metrics portal and the DX Metrics importer.

## Schema management

The canonical DX Metrics schema lives in `src/schema.ts`, and the Drizzle CLI
configuration lives in this package as `drizzle.config.ts`.

### Apply schema changes

Start the local services first:

```bash
# From the monorepo root
docker compose --profile dx-metrics up -d
```

Then apply the current schema to the target database from this package:

```bash
cd packages/dx-metrics-core
export DATABASE_URL=postgresql://postgresql:postgresql@172.18.0.1:5432/postgresql
pnpm db:push
```

DX Metrics currently uses `drizzle-kit push` as the schema update workflow.
There is no committed `drizzle/` migration history yet, even though the config
already reserves that folder for future generated migrations.

## Local database connection

When running outside Docker Compose, the database URL usually needs to point to
the Docker network gateway:

```bash
DATABASE_URL=postgresql://postgresql:postgresql@172.18.0.1:5432/postgresql
```

To find the correct IP, inspect the Docker network:

```bash
docker network inspect dx-metrics_default
```

Look for the gateway IP in the network config (commonly `172.18.0.1` for the
default bridge network).
