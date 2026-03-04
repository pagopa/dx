---
name: terraform-tests
description: Generate tests for Terraform modules. Use everytime tests are missing or need to be updated.
metadata:
  author: pagopa-dx
  version: "1.0"
compatibility: requires terraform, go, and access to the internet
---

# Terraform Module Testing Skill

This skill generates comprehensive test suites for Terraform modules following HashiCorp's Terraform Testing Framework best practices. Tests are organized into four layers: Unit, Contract, Integration, and End-to-End (E2E).

> **For AI Agents**: This skill references detailed documentation files. All relative paths (e.g., `reference/unit-tests.md`) are relative to `.github/skills/terraform-tests/` from the workspace root. When you need detailed information about a specific test layer, use `read_file` to load the referenced documentation file.

## Test Philosophy

Based on [HashiCorp's Testing Framework](https://www.hashicorp.com/en/blog/testing-hashicorp-terraform):

- **Unit Tests**: Fast, mocked tests that verify module logic without provisioning real infrastructure
- **Contract Tests**: Validate input contracts, constraints, and expected failures
- **Integration Tests**: Provision real infrastructure to test module behavior in isolation
- **E2E Tests**: Deploy complete scenarios with workloads to verify end-to-end functionality

## Test Structure

```bash
tests/
├── unit.tftest.hcl           # Unit tests (mocked)
├── contract.tftest.hcl       # Contract tests (mocked)
├── integration.tftest.hcl    # Integration tests (real resources)
├── e2e_test.go               # E2E tests (Terratest + workloads)
├── go.mod                    # Go dependencies for E2E tests
├── README.md                 # Test documentation
├── setup/                    # Shared setup module for integration tests only
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── providers.tf
│   └── README.md
└── apps/                     # Test applications for E2E tests
    └── <scenario_name>/      # App exposes HTTP APIs called by e2e_test.go
        ├── Dockerfile
        ├── project.json
        ├── README.md
        └── src/
            ├── go.mod
            └── main.go
```

## Test Execution

Tests are run using NX commands:

```bash
nx run <module-name>:test:unit
nx run <module-name>:test:contract
nx run <module-name>:test:integration
nx run <module-name>:test:e2e
```

**Important**: After modifying unit and contract tests, **always execute them** to verify they pass. Integration and E2E tests are slow and should not be run during development, only in CI/CD.

## Test Layers Quick Reference

### 1. Unit Tests

- **Purpose**: Verify module logic without provisioning resources
- **Details**: See [reference/unit-tests.md](./reference/unit-tests.md)
- **Key**: Use mocked providers, test logic and computations

### 2. Contract Tests

- **Purpose**: Validate input constraints and expected failures
- **Details**: See [reference/contract-tests.md](./reference/contract-tests.md)
- **Key**: Use `expect_failures`, test validation rules

### 3. Integration Tests

- **Purpose**: Provision real infrastructure to test module behavior
- **Details**: See [reference/integration-tests.md](./reference/integration-tests.md)
- **Key**: Use real providers, reference `tests/setup/` module, use "int" in domain names

### 4. Setup Module

- **Purpose**: Shared infrastructure for integration tests only
- **Details**: See [reference/setup-module.md](./reference/setup-module.md)
- **Key**: Reuse infrastructure from `infra/resources/_modules/testing`

### 5. E2E Tests

- **Purpose**: Deploy complete scenarios with workloads
- **Details**: See [reference/e2e-tests.md](./reference/e2e-tests.md)
- **Key**: Deploy from `examples/`, call test app APIs, verify behavior

### 6. Test Applications

- **Purpose**: Containerized apps that expose HTTP APIs for E2E verification
- **Details**: See [reference/test-applications.md](./reference/test-applications.md)
- **Key**: Simple Go HTTP servers, use DefaultAzureCredential

### 7. Examples Structure

- **Purpose**: Structure for E2E test fixtures and module under test
- **Details**: See [reference/examples-structure.md](./reference/examples-structure.md)
- **Key**: `fixtures.tf` (infrastructure) + `mut.tf` (module under test)

## Usage Scenarios

### Scenario 1: New Module

When creating a new Terraform module:

1. **Analyze the module**: Understand variables, resources, logic, and use cases
2. **Generate unit.tftest.hcl**: Mock providers, test logic and defaults
3. **Generate contract.tftest.hcl**: Test validation rules and constraints
4. **Generate integration.tftest.hcl**: Test real resource creation
5. **Create tests/setup/**: Query existing infrastructure, output needed values
6. **Generate e2e_test.go**: Deploy from examples/, call test app APIs
7. **Create examples/**: Add `fixtures.tf` and `mut.tf` for E2E tests
8. **Create test apps**: Go HTTP servers exposing APIs for verification
9. **Generate tests/README.md**: Use [templates/test-readme.md](templates/test-readme.md)
10. **Finalize**: Run unit/contract tests, update mut.tf to registry+1, run `pnpm changeset`

### Scenario 2: Modify Existing Module

When modifying a module with modern tests:

1. **Analyze the change**: Determine which test layers need updates
2. **Update unit tests**: Add run blocks for new scenarios, execute tests
3. **Update contract tests**: Add validation tests for new variables, execute tests
4. **Update integration tests**: Add scenarios for new configurations if needed
5. **Update E2E tests**: Add test functions for new scenarios if needed
6. **Update test apps**: Add/modify endpoints to match new functionality
7. **Version bump**: Run `pnpm changeset`, update mut.tf if needed

### Scenario 3: Upgrade Legacy Tests

When a module has legacy tests (single file, no modern structure):

1. **Analyze existing tests**: Identify covered scenarios
2. **Delete legacy files completely**: Remove old test files entirely
3. **Generate modern test suite**: Follow "New Module" scenario
4. **Create missing components**: Add setup/, examples/, apps/, e2e_test.go
5. **Verify coverage**: Execute unit/contract tests, ensure no regression
6. **Version bump**: Update mut.tf to registry+1, run `pnpm changeset`

## Best Practices

1. **Variable Reuse**: Define variables once at the top, override in run blocks
2. **Descriptive Names**: Use clear, descriptive run block names
3. **One Concern Per Test**: Each run block tests one specific aspect
4. **Setup Module**: Keep it lean, reuse existing infrastructure from `infra/resources/_modules/testing`
5. **Real Providers in Integration**: Never mock in integration tests
6. **Examples for E2E**: E2E tests deploy from examples/, not module directly or tests/setup
7. **Deterministic Mocks**: Use fixed IDs in override_data for consistency
8. **Comprehensive Assertions**: Test all critical properties
9. **Error Messages**: Provide helpful error_message in every assert
10. **Test Apps**: Keep simple, expose APIs, ensure contract compatibility with E2E tests
11. **Cleanup**: Always include teardown in E2E tests
12. **Documentation**: Keep README.md updated with scenarios
13. **Naming Limits**: Use "int" not "integration" in domain names for Azure length limits
14. **Random Instance Numbers**: Use for Key Vault and other soft-delete resources
15. **Separate Infrastructures**: Integration and E2E use separate resource groups and networks
16. **Execute Tests**: Always run unit/contract tests after changes; skip integration/e2e during dev

## Requirements Summary

- **Module README**: Do not create (only create tests/README.md)
- **Mocking**: Use mock_provider for unit and contract tests
- **Setup folder**: ONLY for integration tests (E2E uses examples/fixtures.tf)
- **Test execution**: `nx run <module-name>:test:<layer>`
- **Follow examples**: azure_app_configuration and azure_cosmos_account modules
- **Test naming**: `module_name_feature_being_tested` pattern
- **Domain naming**: Use "int" (not "integration") and "e2e" for Azure length limits
- **Module reference**: Local `source = "../.."` during development, registry+version before commit
- **Version bump**: Run `pnpm changeset` for patch bump when adding/modifying tests
- **Execute tests**: Always run unit/contract after changes; skip slow integration/e2e
- **Legacy cleanup**: Delete old test files completely when upgrading
- **Examples structure**: Must have fixtures.tf (infrastructure) + mut.tf (module)
- **Random instances**: Use random_integer for Key Vault and soft-delete resources
- **API contract**: Test apps must expose APIs compatible with E2E tests

## Key Differences: Integration vs E2E

| Aspect         | Integration Tests                | E2E Tests                                |
| -------------- | -------------------------------- | ---------------------------------------- |
| Infrastructure | Uses `tests/setup/` module       | Uses `examples/fixtures.tf`              |
| Module source  | Direct module reference          | Module in `examples/mut.tf`              |
| Test apps      | Not used                         | Required (in `tests/apps/`)              |
| Domain name    | "int"                            | "e2e"                                    |
| Separation     | Separate from E2E infrastructure | Separate from integration infrastructure |
| Purpose        | Test module in isolation         | Test complete scenarios with workloads   |

## Notes

- Unit and contract tests run in CI on every PR
- Integration and E2E tests run on schedule (weekly/nightly)
- Integration and E2E tests require real Azure subscription and incur costs
- Test applications use DefaultAzureCredential (managed identity in tests)
- Setup module (tests/setup/) outputs drive integration test inputs only
- E2E tests use fixtures.tf in examples/, not tests/setup/
- Examples must be deployable independently for E2E tests
- Persistent test infrastructure (VNet, DNS zones, peering, Log Analytics, etc.) is defined in `infra/resources/_modules/testing`
- Integration and E2E infrastructures are completely separate
- Always execute unit and contract tests after modifications to verify they pass
- Do not run integration/e2e tests during development (slow, expensive)

## Reference Documentation

- [Unit Tests Details](./reference/unit-tests.md)
- [Contract Tests Details](./reference/contract-tests.md)
- [Integration Tests Details](./reference/integration-tests.md)
- [Setup Module Details](./reference/setup-module.md)
- [E2E Tests Details](./reference/e2e-tests.md)
- [Test Applications Details](./reference/test-applications.md)
- [Examples Structure Details](./reference/examples-structure.md)
- [Test README Template](./templates/test-readme.md)
