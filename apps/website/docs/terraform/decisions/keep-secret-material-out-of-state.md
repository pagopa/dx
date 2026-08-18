# ADR-003: Keep Secret Material Out of Terraform State

- **Status:** Accepted
- **Date:** 2026-08-18

## Context

Terraform records managed values in state and may expose them through plans, logs, variables, outputs, application settings, or environment variables. Marking a value as sensitive only hides selected displays; it does not remove the value from state.

## Decision

Do not pass secret material through Terraform code, variables, locals, outputs, `.tfvars`, application settings, or container environment variables.

Use provider-native references and write-only secret operations where available. Grant runtime identities only the permissions required to resolve those references.

Stop implementation when the requested capability requires secret material and no state-safe pattern is available.

## Consequences

- Terraform state does not become the system of record for application secrets.
- Runtime identity and least-privilege access become required supporting infrastructure.
- Some secret provisioning must occur through a dedicated secure process.
- Provider-specific skills and documentation remain responsible for implementation details.

## Exceptions

There is no silent fallback. Any alternative process must be explicitly selected and documented without placing the secret value in generated Terraform.
