# Terraform Testing Strategy for Azure Cosmos DB Module

This document outlines the comprehensive testing strategy implemented for the Azure Cosmos DB Terraform module, following HashiCorp's testing best practices and the testing pyramid approach.

## Testing Pyramid Overview

```
    /\
   /  \     E2E Tests (Fewest, Slowest)
  /____\    - Test actual functionality
 /      \   - Weekly automated runs
/        \  - Manual validation
\        /  
 \______/   Integration Tests (Some, Slower)  
 /      \   - Deploy real resources
/        \  - Verify resource creation
\        /  - Automated on PR labels
 \______/   
 /      \   Contract Tests (More, Fast)
/        \  - Input validation rules  
\        /  - Error handling
 \______/   - Automated on PRs
 /      \   
/________\  Unit Tests (Most, Fastest)
           - Configuration logic
           - Resource attributes  
           - Automated on PRs
```

## Test Types

### 1. Unit Tests (`tests/unit.tftest.hcl`)
**Purpose**: Test configuration logic, resource attributes, and computed values without creating infrastructure.

**Command**: `terraform plan` (no real resources)

**Tests Include**:
- ✅ Naming convention logic
- ✅ Consistency policy presets (Default, HighConsistency, HighPerformance, BalancedStaleness, Custom)
- ✅ Serverless vs Provisioned tier configuration
- ✅ Geo-location configurations (primary + secondary)
- ✅ Role assignment mappings (readers/writers)
- ✅ Tag merging logic
- ✅ Customer managed key configurations
- ✅ Alert configurations

**Run Command**:
```bash
terraform test tests/unit.tftest.hcl
```

### 2. Contract Tests (`tests/contract.tftest.hcl`)
**Purpose**: Validate input parameters and ensure proper error messages for invalid configurations.

**Implementation**: Variable validation rules, expect_failures assertions

**Tests Include**:
- ✅ Invalid tier values
- ✅ Invalid environment parameters (prefix, env_short, location, instance_number)
- ✅ Invalid subnet resource IDs
- ✅ Invalid consistency policy configurations
- ✅ Invalid customer managed key setups
- ✅ Too many secondary geo locations
- ✅ Invalid failover priorities
- ✅ Invalid principal IDs (non-UUID format)
- ✅ Too many principal IDs (>20 limit)

**Run Command**:
```bash
terraform test tests/contract.tftest.hcl
```

### 3. Integration Tests (`tests/integration.tftest.hcl`)
**Purpose**: Deploy real Azure resources and verify they are created correctly.

**Command**: `terraform apply` + `terraform destroy`

**Tests Include**:
- ✅ Minimal serverless deployment
- ✅ Multi-region configuration
- ✅ Role assignments functionality
- ✅ Custom consistency policies
- ✅ Backup configuration validation

**Run Command** (requires Azure credentials):
```bash
terraform test tests/integration.tftest.hcl
```

### 4. End-to-End Tests (`tests/e2e.tftest.hcl`)
**Purpose**: Test complete functionality of deployed infrastructure.

**Tests Include**:
- ✅ Comprehensive multi-region deployment
- ✅ Endpoint accessibility validation
- ✅ Private endpoint configuration
- ✅ Network security verification
- ✅ Backup and monitoring operational checks
- ✅ Role assignments verification
- ✅ Output validation

**Run Command** (requires Azure credentials):
```bash
terraform test tests/e2e.tftest.hcl
```

### 5. Legacy Tests (`tests/legacy.tftest.hcl`)
**Purpose**: Backward compatibility with existing test suite.

## Variable Validations (Contract Tests in Code)

The module includes comprehensive input validation rules:

### Environment Object
```hcl
validation {
  condition     = can(regex("^[a-z0-9]+$", var.environment.prefix))
  error_message = "environment.prefix must contain only lowercase letters and numbers."
}

validation {
  condition     = can(regex("^[a-z]$", var.environment.env_short))
  error_message = "environment.env_short must be a single lowercase letter."
}

validation {
  condition     = contains(["italynorth", "westeurope", "northeurope", "eastus", "westus2", "centralus", "southcentralus"], var.environment.location)
  error_message = "environment.location must be a valid Azure region."
}
```

### Subnet ID Validation
```hcl
validation {
  condition     = can(regex("^/subscriptions/[a-fA-F0-9-]{36}/resourceGroups/.+/providers/Microsoft.Network/virtualNetworks/.+/subnets/.+$", var.subnet_pep_id))
  error_message = "subnet_pep_id must be a valid Azure subnet resource ID."
}
```

### Principal IDs Validation
```hcl
validation {
  condition = alltrue([
    for principal_id in concat(var.authorized_teams.readers, var.authorized_teams.writers) :
    can(regex("^[a-fA-F0-9-]{36}$", principal_id))
  ])
  error_message = "All principal IDs must be valid UUIDs (Azure AD object IDs)."
}
```

## CI/CD Integration

### Pull Request Workflow
**File**: `.github/workflows/_validate-terraform-test-modules.yaml`

**Triggers**: PR opened/synchronized

**Jobs**:
1. **Fast Tests** (Always run):
   - `terraform fmt -check`
   - `terraform validate` 
   - Unit tests (`tests/unit.tftest.hcl`)
   - Contract tests (`tests/contract.tftest.hcl`)

2. **Integration Tests** (Conditional):
   - Only on `workflow_dispatch` or PR label `run-integration-tests`
   - Requires Azure credentials
   - Creates real resources

### Weekly Integration Testing
**File**: `.github/workflows/weekly-terraform-integration-tests.yaml`

**Triggers**: 
- Scheduled: Every Sunday at 3 AM UTC
- Manual: `workflow_dispatch`

**Jobs**:
- Integration tests for all modules
- End-to-end tests 
- Automated issue creation on failures
- Test report generation

## Running Tests Locally

### Prerequisites
```bash
# Install Terraform >= 1.6
terraform version

# For integration/E2E tests, authenticate with Azure
az login
```

### Unit Tests (No Azure required)
```bash
cd infra/modules/azure_cosmos_account
terraform init -backend=false
terraform test tests/unit.tftest.hcl
```

### Contract Tests (No Azure required)
```bash
terraform test tests/contract.tftest.hcl
```

### Integration Tests (Azure required)
```bash
terraform init
terraform test tests/integration.tftest.hcl
```

### All Tests
```bash
terraform test  # Runs all test files
```

## Cost Management

### Test Resource Strategy
- **Unit/Contract Tests**: No resources created (cost: $0)
- **Integration Tests**: Serverless Cosmos DB (cost: ~$0.25/hour when idle)
- **E2E Tests**: Minimal production-like setup (cost: ~$1-5/hour)

### Cost Optimization
- Use serverless tier (`tier = "s"`) for all tests
- Disable monitoring alerts in tests
- Auto-cleanup after test completion
- Run expensive tests weekly, not on every PR

## Best Practices Applied

✅ **Testing Pyramid**: More unit tests, fewer integration tests
✅ **Fast Feedback**: Unit/contract tests in <30 seconds  
✅ **Isolation**: Each test run uses unique resource names
✅ **Cleanup**: Resources automatically destroyed after tests
✅ **Documentation**: Clear error messages in assertions
✅ **Validation**: Comprehensive input validation rules
✅ **CI Integration**: Automated testing on PRs
✅ **Cost Control**: Expensive tests run weekly
✅ **Monitoring**: Automated issue creation on test failures

## Module Testing Coverage

| Component | Unit | Contract | Integration | E2E |
|-----------|------|----------|-------------|-----|
| Resource Naming | ✅ | ✅ | ✅ | ✅ |
| Consistency Policy | ✅ | ✅ | ✅ | ✅ |
| Geo Locations | ✅ | ✅ | ✅ | ✅ |
| Role Assignments | ✅ | ✅ | ✅ | ✅ |
| Private Endpoints | ✅ | - | ✅ | ✅ |
| Backup Configuration | ✅ | - | ✅ | ✅ |
| Monitoring Alerts | ✅ | - | ✅ | ✅ |
| Tag Management | ✅ | - | ✅ | ✅ |
| CMK Configuration | ✅ | ✅ | - | - |
| Input Validation | - | ✅ | - | - |
| Network Security | ✅ | - | ✅ | ✅ |
| Outputs | ✅ | - | ✅ | ✅ |

## Future Enhancements

- [ ] Mocking framework integration for even faster unit tests
- [ ] Performance testing for large-scale deployments  
- [ ] Security scanning integration (Checkov, tfsec)
- [ ] Automated test generation based on variable definitions
- [ ] Integration with Terraform Cloud for private registry testing
- [ ] Cross-region disaster recovery testing
- [ ] Compliance testing (GDPR, SOC2, etc.)

## References

- [HashiCorp Terraform Testing Blog Post](https://www.hashicorp.com/en/blog/testing-hashicorp-terraform)
- [Terraform Test Documentation](https://developer.hashicorp.com/terraform/cli/test)
- [Azure Cosmos DB Best Practices](https://docs.microsoft.com/en-us/azure/cosmos-db/best-practice-guide)
