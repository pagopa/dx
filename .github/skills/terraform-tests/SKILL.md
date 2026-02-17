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

## 1. Unit Tests (unit.tftest.hcl)

**Purpose**: Verify module logic, computations, and default behaviors without provisioning resources.

**Key Patterns**:

- Use `mock_provider "azurerm" {}` or equivalent for the cloud provider
- Define shared `variables {}` block at the top with common test inputs
- Use `override_data {}` blocks to mock data source responses
- All tests use `command = plan`
- Test multiple scenarios by overriding specific variables in each `run` block
- Use descriptive test names like `module_name_feature_being_tested`

**Variable Reuse Pattern**:

```hcl
variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/<module_name>/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "<Module Name> unit tests"
  }

  // Required module inputs with sensible defaults
  resource_group_name = "rg-test"
  // ... other common inputs
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_private_dns_zone.example
  values = {
    id   = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.example.azure.com"
    name = "privatelink.example.azure.com"
  }
}

run "module_basic_behavior" {
  command = plan

  assert {
    condition     = azurerm_resource.this.property == "expected_value"
    error_message = "Property must be expected_value when using defaults"
  }
}

run "module_custom_config" {
  command = plan
  variables {
    custom_setting = "custom_value"
  }

  assert {
    condition     = azurerm_resource.this.custom_property == "custom_value"
    error_message = "Custom property must be set correctly"
  }
}
```

**What to Test**:

- Default values and behaviors
- Conditional logic (count, for_each conditions)
- Local variable computations
- Resource property mappings
- Different use cases and configurations
- SKU/tier selection logic
- Feature flags and toggles

## 2. Contract Tests (contract.tftest.hcl)

**Purpose**: Validate input validation, variable constraints, and expected failures.

**Key Patterns**:

- Use `mock_provider` like unit tests
- Share the same `variables {}` block structure as unit tests
- Use `expect_failures = [var.variable_name]` to verify validation rules
- Test boundary conditions and invalid inputs
- Verify preconditions and postconditions
- Test resource naming constraints

**Example**:

```hcl
variables {
  // Same structure as unit tests
  environment = { /* ... */ }
  tags        = { /* ... */ }
  // ... common inputs
}

mock_provider "azurerm" {}

override_data {
  // Same overrides as unit tests if needed
}

run "invalid_size_value" {
  command = plan
  variables {
    size = "invalid"
  }

  expect_failures = [
    var.size,
  ]
}

run "invalid_use_case_combination" {
  command = plan
  variables {
    use_case = "development"
    size     = "premium"
  }

  expect_failures = [
    var.size,
  ]
}

run "valid_explicit_configuration" {
  command = plan
  variables {
    size = "premium"
  }

  assert {
    condition     = azurerm_resource.this.sku == "premium"
    error_message = "Explicit size must be respected"
  }
}

run "naming_constraint_validation" {
  command = plan
  variables {
    environment = merge(var.environment, {
      app_name = "this-name-is-way-too-long-and-should-fail-validation"
    })
  }

  expect_failures = [
    var.environment,
  ]
}
```

**What to Test**:

- Variable validation rules
- Custom validation conditions
- Type constraints
- Value constraints (allowed values, ranges)
- Precondition failures
- Postcondition failures
- Naming convention enforcement
- Mutually exclusive configurations

## 3. Integration Tests (integration.tftest.hcl)

**Purpose**: Provision real infrastructure to verify module creates resources correctly in isolation.

**Key Patterns**:

- Use real providers (no mocks)
- First `run` block is always "setup" that calls `./tests/setup` module
- Use `command = apply` to provision resources
- Reference setup outputs: `run.setup.resource_group_name`
- Test multiple scenarios with different configurations
- Clean naming to avoid conflicts: `merge(var.environment, { app_name = "unique-suffix" })`
- **Use "int" (not "integration") in domain names** due to Azure resource name length limits
- Integration infrastructure is separate from E2E infrastructure

**Example**:

```hcl
provider "azurerm" {
  features {}
}

provider "pagopa-dx" {}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "int"  # Use "int" not "integration" for name length limits
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/<module_name>/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "<Module Name> integration tests"
  }

  use_case  = "default"
  test_kind = "integration"
}

run "setup" {
  module {
    source = "./tests/setup"
  }
  variables {
    environment = var.environment
    test_kind   = var.test_kind
    tags        = var.tags
  }
}

run "apply_default" {
  command = apply
  variables {
    environment         = var.environment
    tags                = var.tags
    resource_group_name = run.setup.resource_group_name
    virtual_network     = run.setup.virtual_network
    subnet_pep_id       = run.setup.subnet_pep_id
    // ... other inputs from setup
  }

  assert {
    condition     = azurerm_resource.this.property == "expected"
    error_message = "Property must be set correctly"
  }
}

run "apply_custom_config" {
  command = apply
  variables {
    environment         = merge(var.environment, { app_name = "custom" })
    tags                = var.tags
    resource_group_name = run.setup.resource_group_name
    custom_setting      = "custom_value"
    // ... other inputs
  }

  assert {
    condition     = azurerm_resource.this.custom_property == "custom_value"
    error_message = "Custom configuration must be applied"
  }
}
```

**What to Test**:

- Resource creation with default configuration
- Resource creation with custom configurations
- Resource properties are set correctly
- Dependencies are created in correct order
- Tags are applied correctly
- Monitoring/alerting resources are created
- IAM roles are assigned
- Network configurations (private endpoints, etc.)
- Integration with other Azure services

## 4. Setup Module (tests/setup/)

**Purpose**: Provision infrastructure needed **ONLY by integration tests**. E2E tests use fixtures in examples/ instead.

**Key Requirements**:

- Reuse existing test infrastructure from `infra/resources/_modules/testing`
- Minimize resource creation
- Output all values needed by integration tests
- Use `provider::dx::resource_name` for naming
- Test kind should be "integration" (use "int" in domain names)

**Structure**:

```
tests/setup/
├── main.tf         # Data sources and minimal resources
├── variables.tf    # Environment, tags, test_kind
├── outputs.tf      # All values needed by tests
├── providers.tf    # Provider requirements
└── README.md       # Terraform-docs generated
```

**main.tf Pattern**:

```hcl
locals {
  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }

  existing_resources = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = ""
    name            = var.test_kind  // "integration" or "e2e"
    instance_number = tonumber(var.environment.instance_number)
  }
}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "test" {
  name = provider::dx::resource_name(merge(
    local.existing_resources,
    { resource_type = "resource_group" }
  ))
}

data "azurerm_virtual_network" "vnet" {
  name                = provider::dx::resource_name(merge(
    local.existing_resources,
    { resource_type = "virtual_network" }
  ))
  resource_group_name = data.azurerm_resource_group.test.name
}

data "azurerm_subnet" "pep" {
  name                 = provider::dx::resource_name(merge(
    local.existing_resources,
    { resource_type = "subnet", name = "pep" }
  ))
  resource_group_name  = data.azurerm_resource_group.test.name
  virtual_network_name = data.azurerm_virtual_network.vnet.name
}

// Create resources only if they don't exist
// Use random suffixes to avoid naming conflicts
```

**variables.tf**:

```hcl
variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to setup resources"
}

variable "test_kind" {
  type        = string
  description = "Test type: integration (e2e tests don't use setup module)"
  validation {
    condition     = var.test_kind == "integration"
    error_message = "test_kind must be 'integration' (setup is not used by e2e tests)"
  }
}
```

**outputs.tf**:

```hcl
output "subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "resource_group_name" {
  value = data.azurerm_resource_group.test.name
}

output "virtual_network" {
  value = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_resource_group.test.name
  }
}

output "subnet_pep_id" {
  value = data.azurerm_subnet.pep.id
}

// Add all outputs needed by the module under test
```

## 5. E2E Tests (e2e_test.go)

**Purpose**: Deploy complete scenarios with workloads to verify end-to-end functionality.

**Key Patterns**:

- Use Terratest framework
- Deploy from `examples/` directory (not the module directly, not tests/setup)
- Examples must contain `fixtures.tf` (support infrastructure) and `mut.tf` (module under test)
- E2E infrastructure is **separate from integration infrastructure**
- Use test_structure for stage management
- Deploy test applications as containers or compute
- Verify runtime behavior by calling HTTP APIs exposed by test apps (tests/apps/)
- Always include teardown stage

**Structure**:

```go
package test

import (
	"testing"
	httpHelper "github.com/gruntwork-io/terratest/modules/http-helper"
	"github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
)

func Test<ModuleName><Scenario>(t *testing.T) {
	fixtureFolder := "../examples/<scenario_name>/"

	test_structure.RunTestStage(t, "setup", func() {
		terraformOptions := &terraform.Options{
			TerraformDir: fixtureFolder,
		}

		test_structure.SaveTerraformOptions(t, fixtureFolder, terraformOptions)
		terraform.InitAndApply(t, terraformOptions)
	})

	test_structure.RunTestStage(t, "validate_<aspect>", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)

		// Get outputs
		resourceName := terraform.Output(t, terraformOptions, "resource_name")
		appIP := terraform.Output(t, terraformOptions, "app_ip_address")

		// Verify behavior
		probeEndpoint(t, appIP, resourceName, 200)
	})

	test_structure.RunTestStage(t, "teardown", func() {
		terraformOptions := test_structure.LoadTerraformOptions(t, fixtureFolder)
		terraform.Destroy(t, terraformOptions)
	})
}

func probeEndpoint(t *testing.T, appIP string, resource string, expectedStatus int) {
	url := fmt.Sprintf("http://%s:8080/probe?resource=%s", appIP, resource)

	tlsConfig := &tls.Config{}
	maxRetries := 10
	delay := 5 * time.Second

	httpHelper.HttpGetWithRetryWithCustomValidation(
		t, url, tlsConfig, maxRetries, delay,
		func(statusCode int, body string) bool {
			return statusCode == expectedStatus && validateBody(body)
		},
	)
}
```

**What to Test**:

- Network connectivity (public vs private)
- IAM permissions and authentication
- Integration with dependent services (Key Vault, Storage, etc.)
- Service-specific functionality
- Multi-region scenarios
- Disaster recovery capabilities

## 6. Test Applications (tests/apps/)

**Purpose**: Containerized applications that test module functionality at runtime. These apps **expose HTTP APIs that are called by E2E tests (step 5)** to verify end-to-end behavior.

**Structure**:

```
tests/apps/<scenario_name>/
├── Dockerfile          # Multi-stage build
├── project.json        # Nx project configuration
├── README.md          # App documentation
└── src/
    ├── go.mod
    └── main.go        # Test application code
```

**Application Pattern**:

- Simple HTTP server with test endpoints
- Use Azure SDKs with DefaultAzureCredential
- Accept configuration via query parameters or environment variables
- Return structured JSON responses (e.g., `{"status":"ok"}` or `{"status":"fail","error":"..."}`)
- Handle timeouts appropriately
- **API contract must match what E2E tests expect** (step 5 calls these APIs)

**Example main.go**:

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	// Import relevant Azure SDK packages
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/probe", probeHandler)

	addr := ":8080"
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Printf("listen error: %s", err)
	}
}

func probeHandler(w http.ResponseWriter, r *http.Request) {
	resourceName := r.URL.Query().Get("resource")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	credential, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{"status":"fail","error":"%s"}`, err.Error())
		return
	}

	// Test the Azure service
	err = testService(ctx, credential, resourceName)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, `{"status":"fail","error":"%s"}`, err.Error())
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"ok"}`)
}
```

## 7. Test README (tests/README.md)

**Purpose**: Document the test suite and how to run it.

**Template**:

````markdown
# Tests for <Module Name>

This directory contains comprehensive tests for the `<module_name>` Terraform module following HashiCorp's Testing Framework best practices.

## Test Layers

### Unit Tests (unit.tftest.hcl)

Fast, mocked tests that verify module logic without provisioning infrastructure.

Run: `terraform test -filter='tests/unit.tftest.hcl'`

### Contract Tests (contract.tftest.hcl)

Validate input contracts, constraints, and expected failures.

Run: `terraform test -filter='tests/contract.tftest.hcl'`

### Integration Tests (integration.tftest.hcl)

Provision real Azure resources to test module behavior in isolation.

Run: `terraform test -filter='tests/integration.tftest.hcl'`

**Note**: Integration tests provision real Azure resources and may incur costs.

### E2E Tests (e2e_test.go)

Deploy complete scenarios with workloads to verify end-to-end functionality.

Run: `go test -v -timeout 1h ./tests`

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

## Examples Structure (for E2E Tests)

E2E tests deploy from `examples/` directories. Each example must contain:

### fixtures.tf

Contains supporting infrastructure for the E2E test:

- Resource groups
- Test applications (Azure Container Instances)
- Network resources (subnets for containers)
- IAM role assignments
- Any auxiliary resources needed by the test

**Important**: Resources like Key Vault that use soft delete **must use random instance numbers**:

```hcl
resource "random_integer" "instance_number" {
  min = 1
  max = 99
}

resource "azurerm_key_vault" "kv" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    resource_type   = "key_vault"
    instance_number = random_integer.instance_number.result
  }))
  # ... other config
}
```
````

### mut.tf (Module Under Test)

Contains the module being tested:

```hcl
module "example" {
  # During test development, use local reference:
  source = "../.."  # Points to module root

  # Before commit, update to registry version + 1:
  # source  = "pagopa-dx/azure-<service>/azurerm"
  # version = "~> X.Y"  # Next version after bump

  environment = local.environment
  # ... module inputs
}
```

**Critical**: When committing tests for a module:

1. Update `mut.tf` to reference the module from the registry with version + 1
2. Run `pnpm changeset` and create a **patch** version bump
3. The changeset ensures the version referenced in tests will exist after publish

```

## Usage Scenarios

### Scenario 1: New Module

When creating a new Terraform module:

1. **Analyze the module** to understand:
   - All input variables and their validation rules
   - All resources created
   - Computed values and conditional logic
   - Integration points (data sources, dependencies)
   - Use cases and configurations

2. **Generate unit.tftest.hcl**:
   - Define shared variables block
   - Mock all providers
   - Override data sources
   - Create run blocks for each use case and configuration
   - Test conditional logic and computed values

3. **Generate contract.tftest.hcl**:
   - Reuse variables structure from unit tests
   - Test all variable validation rules
   - Test invalid input combinations
   - Verify preconditions and postconditions

4. **Generate integration.tftest.hcl**:
   - Define test-specific variables
   - Create setup run block
   - Create run blocks for key scenarios
   - Focus on resource creation and configuration

5. **Create tests/setup/** module:
   - Query existing test infrastructure
   - Create minimal resources if needed
   - Output everything needed by integration tests

6. **Generate e2e_test.go**:
   - Identify E2E scenarios from module purpose
   - Create test functions with Terratest
   - Deploy from examples/ (NOT tests/setup)
   - Call HTTP APIs exposed by test apps to verify behavior

7. **Create examples/ for E2E**:
   - Create `fixtures.tf` with support infrastructure
   - Create `mut.tf` with module under test (use local source initially)
   - Use random instance numbers for resources with soft delete (Key Vault, etc.)
   - Use "e2e" in domain names
   - E2E infrastructure is separate from integration

8. **Create test applications**:
   - Simple Go HTTP servers in tests/apps/
   - Expose APIs that E2E tests will call
   - Test specific functionality
   - Return structured JSON responses
   - Ensure API contract matches E2E test expectations

9. **Generate tests/README.md**:
   - Document test structure
   - Explain scenarios
   - Include run commands

10. **Version and finalize**:
   - Run unit and contract tests to verify they pass
   - Update mut.tf in examples/ to reference registry version + 1
   - Run `pnpm changeset` and create a **patch** version bump
   - Commit changes

### Scenario 2: Modify Existing Module

When modifying a module with modern tests:

1. **Analyze the change**:
   - New variables? → Add to contract tests
   - New resources? → Add to integration tests
   - New logic? → Add to unit tests
   - New integrations? → Add to E2E tests

2. **Update unit tests**:
   - Add run blocks for new scenarios
   - Update assertions for changed behavior
   - Maintain variable reuse pattern
   - **Execute tests to verify they pass**

3. **Update contract tests**:
   - Add validation tests for new variables
   - Test new constraint combinations
   - **Execute tests to verify they pass**

4. **Update integration tests**:
   - Add scenarios for new configurations
   - Update assertions for changed resources
   - Update tests/setup if needed
   - Use "int" in domain names

5. **Update E2E tests** (if needed):
   - Add new test functions for new scenarios
   - Update existing tests if behavior changed
   - Update fixtures.tf if infrastructure changes needed
   - Ensure mut.tf references correct module version

6. **Update test apps** (if needed):
   - Add endpoints for new functionality
   - Update existing endpoints if needed
   - Maintain API contract with E2E tests

7. **Version bump**:
   - Run `pnpm changeset` to bump version appropriately
   - Update mut.tf to reference new version if needed

### Scenario 3: Upgrade Legacy Tests

When a module has legacy tests (single file combining unit and contract, no integration/e2e):

1. **Analyze existing tests**:
   - Identify what scenarios are covered
   - Extract variable definitions
   - Understand what needs testing

2. **Delete legacy test files completely**:
   - Remove old combined test files entirely
   - Remove old test infrastructure if any
   - Keep examples/ if they exist and are suitable for E2E

3. **Generate modern test suite**:
   - Follow "New Module" scenario completely
   - Ensure all legacy scenarios are covered
   - Add missing test coverage
   - Improve test organization
   - Separate unit, contract, integration, and E2E tests properly

4. **Create missing components**:
   - Add tests/setup/ module for integration tests
   - Create examples/ with fixtures.tf and mut.tf for E2E
   - Add test apps in tests/apps/
   - Add E2E tests (e2e_test.go)
   - Use random instance numbers for soft-delete resources

5. **Verify test coverage**:
   - **Execute unit tests** to verify they pass
   - **Execute contract tests** to verify they pass
   - Ensure no regression from legacy tests
   - Document any new requirements

6. **Version bump**:
   - Update mut.tf to reference registry version + 1
   - Run `pnpm changeset` and create a **patch** version bump

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

## Requirements

- **Do not create README.md for module itself** (only for tests/)
- **Use mock_provider for unit and contract tests**
- **Use setup/ folder ONLY for integration tests** (E2E uses fixtures.tf in examples/)
- **Run tests with**: `terraform test -filter='tests/<file>'` (PowerShell on macOS)
- **Follow examples** from azure_app_configuration and azure_cosmos_account modules
- **Test naming**: Use `module_name_feature_being_tested` pattern
- **Provider format**: Use correct provider name (azurerm, aws, github-dx, etc.)
- **Domain naming**: Use "int" (not "integration") and "e2e" in domain names
- **Module reference**: Use local `source = "../.."` during development, registry + version before commit
- **Version bump**: Run `pnpm changeset` and create patch bump when adding/modifying tests
- **Execute tests**: Always run unit/contract tests after changes; skip slow integration/e2e
- **Legacy cleanup**: Delete old test files completely when upgrading
- **Examples structure**: Must have fixtures.tf (infrastructure) and mut.tf (module under test)
- **Random instances**: Use random_integer for Key Vault and other soft-delete resources
- **API contract**: Test apps (step 6) must expose APIs compatible with E2E tests (step 5)

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
```
