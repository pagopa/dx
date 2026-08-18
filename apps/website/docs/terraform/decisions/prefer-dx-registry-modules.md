# ADR-001: Prefer DX Registry Modules

- **Status:** Accepted
- **Date:** 2026-08-18

## Context

Raw cloud-provider resources expose low-level configuration and allow teams to implement naming, security, networking, diagnostics, and operational behavior differently. DX Registry modules encode reviewed defaults and provide a versioned interface shared across repositories.

## Decision

Use a matching `pagopa-dx/*` Registry module before introducing raw provider resources.

Raw resources are allowed only for capabilities the module does not support. Keep supported capabilities on the DX module and explain the uncovered gap.

Pin Registry modules with a compatible `~> major.minor` constraint derived from the module release.

## Consequences

- Teams inherit consistent defaults and supporting infrastructure.
- Module upgrades have an explicit semantic-version contract.
- Contributors must inspect the module contract before implementation.
- Unsupported requirements may need a module enhancement or a narrowly scoped raw resource.

## Exceptions

An exception requires evidence that no DX module supports the capability or that the user intentionally accepts a documented deviation.
