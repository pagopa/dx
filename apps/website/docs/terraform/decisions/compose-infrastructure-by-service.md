# ADR-002: Compose Infrastructure by Service

- **Status:** Accepted
- **Date:** 2026-08-18

## Context

Large environment-root configurations mix unrelated resources, permissions, and operational concerns. Excessive module nesting creates similar coupling behind additional abstraction.

## Decision

Use environment roots as composition layers configured through `locals.tf`. Do not introduce root `variables.tf`.

Create a local module when one logical service owns multiple related resources, IAM or network dependencies, or reusable environment-independent behavior. Keep a standalone resource inline when that matches the existing local structure.

## Consequences

- Service ownership and permissions remain localized.
- Environment configuration stays explicit and auditable.
- Local modules can be reused without turning every resource into an abstraction.
- Placement still requires judgment when existing repository patterns conflict.

## Exceptions

When inline and local-module layouts are equally consistent, document the trade-off and let the contributor choose before implementation.
