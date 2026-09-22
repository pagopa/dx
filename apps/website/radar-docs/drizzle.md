---
title: "Drizzle"
ring: trial
tags: [typescript, nodejs, persistence, database, library]
---

[Drizzle](https://orm.drizzle.team/) is a TypeScript ORM for SQL databases. It
keeps a typed schema definition in TypeScript and exposes a SQL-like query
builder, so queries stay close to the underlying dialect while results are fully
typed. It also ships `drizzle-kit` to generate and apply migrations from the
schema.

## Use cases

- Accessing PostgreSQL and other SQL databases from TypeScript services with
  end-to-end type-safety and minimal runtime overhead
- Managing schema changes and migrations as code alongside the application
- Keeping SQL explicit and readable instead of hiding it behind a heavier
  abstraction

## Reference of usage in our organization

- [Interoperability backend monorepo](https://github.com/pagopa/interop-be-monorepo)
- [IO Growth](https://github.com/pagopa/io-growth)
- [Knodia](https://github.com/pagopa/knodia)
- [PLSM Service Management](https://github.com/pagopa/plsm-service-management)
- [DX Metrics shared core](https://github.com/pagopa/dx/tree/main/packages/dx-metrics-core)
