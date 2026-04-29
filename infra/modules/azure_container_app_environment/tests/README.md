# Tests for azure_container_app_environment

This directory contains comprehensive tests for the `azure_container_app_environment` Terraform module following HashiCorp's Testing Framework best practices.

## Test Layers

### Unit Tests (unit.tftest.hcl)

Fast, mocked tests that verify module logic without provisioning infrastructure.

Run: `nx run azure_container_app_environment:test:unit`

### Contract Tests (contract.tftest.hcl)

Validate input contracts, type constraints, and expected failures.

Run: `nx run azure_container_app_environment:test:contract`

### Integration Tests (integration.tftest.hcl)

Provision real Azure resources to test module behavior in isolation.

Run: `nx run azure_container_app_environment:test:integration`

**Note**: Integration tests provision real Azure resources and may incur costs.

## Test Scenarios

### Private mode (default)

Verifies that when `public_network_access_enabled = false`:
- Internal load balancer is enabled
- A private endpoint is created
- Diagnostic settings target the configured Log Analytics workspace
- Zone redundancy is disabled in development, enabled in production
- Management lock is absent in development, present in production

### Public mode

Verifies that when `public_network_access_enabled = true`:
- Internal load balancer is disabled
- No private endpoint is created

## CI/CD Integration

- **Unit & Contract tests**: Run on every PR
- **Integration tests**: Run weekly on schedule (slow, provision real resources)

See `.github/workflows/` for workflow definitions.
