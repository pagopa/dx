# Tests for <Module Name>

This directory contains comprehensive tests for the `<module_name>` Terraform module following HashiCorp's Testing Framework best practices.

## Test Layers

### Unit Tests (unit.tftest.hcl)

Fast, mocked tests that verify module logic without provisioning infrastructure.

Run: `nx run <module-name>:test:unit`

### Contract Tests (contract.tftest.hcl)

Validate input contracts, constraints, and expected failures.

Run: `nx run <module-name>:test:contract`

### Integration Tests (integration.tftest.hcl)

Provision real Azure resources to test module behavior in isolation.

Run: `nx run <module-name>:test:integration`

**Note**: Integration tests provision real Azure resources and may incur costs.

### E2E Tests (e2e_test.go)

Deploy complete scenarios with workloads to verify end-to-end functionality.

Run: `nx run <module-name>:test:e2e`

**Note**: E2E tests deploy full infrastructure and workloads, taking longer to complete.

## Test Scenarios

### <Scenario 1>

Description of what this scenario tests.

### <Scenario 2>

Description of what this scenario tests.

## CI/CD Integration

- **Unit & Contract tests**: Run on every PR
- **Integration tests**: Run weekly on schedule (slow, provision real resources)
- **E2E tests**: Run weekly on schedule (slow, provision real resources + workloads)

See `.github/workflows/` for workflow definitions.
