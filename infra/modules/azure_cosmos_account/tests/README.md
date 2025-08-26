# Azure Cosmos DB Module Tests

This directory contains comprehensive tests for the Azure Cosmos DB module following HashiCorp's Terraform Testing Framework best practices.

## Test Structure

The tests are organized into four categories based on the [HashiCorp testing pyramid](https://www.hashicorp.com/en/blog/testing-hashicorp-terraform):

### 1. Unit Tests (`unit.tftest.hcl`)
- **Purpose**: Fast tests that validate configuration logic and resource attributes
- **Command**: `terraform plan` only - no real infrastructure
- **Focus**: Input validation, local logic, resource configuration
- **Runtime**: ~30 seconds
- **When to run**: Every PR, local development

**Test scenarios:**
- Default configuration validation
- Serverless tier configuration
- Custom consistency policies
- Preset consistency policies
- Geo-replication setup
- Customer managed key configuration
- Naming convention compliance

### 2. Contract Tests (`contract.tftest.hcl`)
- **Purpose**: Validate the module's interface - inputs, outputs, and their relationships
- **Command**: `terraform plan` with some lightweight operations
- **Focus**: Module API, input/output contracts, validation rules
- **Runtime**: ~1 minute
- **When to run**: Every PR, integration testing

**Test scenarios:**
- Output types and values validation
- Input validation error handling
- Input-output mapping verification
- Private endpoint configuration
- Authorized teams configuration
- Tag propagation

### 3. Integration Tests (`integration.tftest.hcl`)
- **Purpose**: Test how the module integrates with other Azure services
- **Command**: `terraform apply` with real but minimal infrastructure
- **Focus**: Service interactions, networking, security, monitoring
- **Runtime**: ~5-10 minutes
- **When to run**: Weekly, before releases

**Test scenarios:**
- Networking integration (Private Endpoints, DNS)
- Azure Monitor integration (alerts, metrics)
- Multi-region geo-replication
- RBAC and team access
- Consistency and performance validation

### 4. End-to-End Tests (`e2e.tftest.hcl`)
- **Purpose**: Complete workflow testing with realistic scenarios
- **Command**: `terraform apply` with full infrastructure
- **Focus**: Real-world scenarios, complete configurations
- **Runtime**: ~15-20 minutes
- **When to run**: Weekly, before releases, staging validation

**Test scenarios:**
- Production-like deployment with all features
- Development environment with cost optimization
- Customer managed key scenarios
- Multi-region disaster recovery setup

## Running Tests

### Run All Tests (Local Development)
```bash
cd /infra/modules/azure_cosmos_account
terraform test
```

### Run Specific Test Categories

**Unit and Contract Tests (CI/PR):**
```bash
terraform test -filter=unit.tftest.hcl,contract.tftest.hcl
```

**Integration Tests:**
```bash
terraform test -filter=integration.tftest.hcl
```

**End-to-End Tests:**
```bash
terraform test -filter=e2e.tftest.hcl
```

### Run Individual Test Files
```bash
terraform test -filter=unit.tftest.hcl
terraform test -filter=contract.tftest.hcl
terraform test -filter=integration.tftest.hcl
terraform test -filter=e2e.tftest.hcl
```

## CI/CD Integration

### PR Validation (Fast Tests)
The GitHub workflow `.github/workflows/_validate-terraform-test-modules.yaml` runs:
- Unit tests
- Contract tests

These tests complete in ~2 minutes and validate:
- Configuration correctness
- Input/output contracts
- Validation rules

### Weekly Validation (Comprehensive Tests)
A separate weekly workflow runs:
- Integration tests
- End-to-end tests

These tests create real Azure resources and validate:
- Service integrations
- Real-world scenarios
- Performance and reliability

## Test Prerequisites

### Required Azure Resources
The tests depend on existing infrastructure created by the `setup` module:
- Resource group: `dx-d-itn-modules-test-rg-01`
- Private endpoint subnet
- Network configuration
- DNS zones

### Environment Variables
```bash
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
export ARM_CLIENT_ID="your-client-id"
export ARM_USE_OIDC=true
```

## Legacy Tests

The original test file has been preserved as `legacy.tftest.hcl` for reference. This file contains the previous testing approach and can be removed once the new structure is fully validated.

## Best Practices

1. **Test Isolation**: Each test run is independent and creates its own resources
2. **Cost Optimization**: Integration and E2E tests use serverless tier when possible
3. **Clean Architecture**: Tests follow the same patterns as the module itself
4. **Comprehensive Coverage**: Tests cover all major features and edge cases
5. **Real Scenarios**: E2E tests mirror real-world usage patterns

## Troubleshooting

### Common Issues

**Authentication Errors:**
- Ensure Azure credentials are properly configured
- Check RBAC permissions for the test subscription

**Resource Conflicts:**
- Tests use unique naming to avoid conflicts
- Clean up may be needed if tests are interrupted

**Timeout Issues:**
- Integration and E2E tests may take longer in some regions
- Consider increasing timeout values if needed

### Debug Mode
Run tests with detailed output:
```bash
TF_LOG=DEBUG terraform test
```

## Contributing

When adding new features to the module:

1. **Add unit tests** for new configuration options
2. **Update contract tests** if inputs/outputs change
3. **Add integration tests** for new Azure service integrations
4. **Include E2E scenarios** for new real-world use cases

Follow the existing test patterns and naming conventions for consistency.