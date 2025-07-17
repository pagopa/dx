# Azure App Service Module Test Suite

This directory contains a comprehensive test suite for the Azure App Service Terraform module, following HashiCorp's testing framework guidelines and the testing pyramid approach.

## Test Structure

The test suite is organized following the testing pyramid pattern:

### Unit Tests
**Fast, isolated tests of individual components**

- `unit-app-service-plan.tftest.hcl` - Tests App Service Plan creation and configuration
  - Different tier configurations (s, m, l, xl)
  - Legacy tier mappings (test, standard, premium)
  - Existing vs. new plan creation
  - Zone balancing and SKU validation

- `unit-app-service-config.tftest.hcl` - Tests App Service configuration
  - Application stack configuration (Node.js, Java)
  - Version management (Node.js versions, Java versions)
  - Security settings (HTTPS, TLS, network access)
  - Core configuration (Always On, HTTP2, health checks)

- `unit-networking.tftest.hcl` - Tests networking components
  - Subnet creation vs. custom subnet usage
  - Service endpoints configuration
  - Private endpoints setup
  - DNS zone configuration

- `unit-staging-slot.tftest.hcl` - Tests staging slot functionality
  - Staging slot creation based on tier
  - Configuration inheritance from main app
  - Slot-specific app settings
  - Private endpoint configuration for slots

### Integration Tests
**Tests that verify how components work together**

- `integration-app-settings.tftest.hcl` - Tests app settings integration
  - Default app settings configuration
  - Custom app settings merging
  - Application Insights integration
  - Sticky settings functionality
  - Complete end-to-end scenarios

- `integration-outputs.tftest.hcl` - Tests module outputs
  - Output structure validation
  - Values with created vs. existing resources
  - Null handling for optional components
  - Full configuration output validation

### Validation Tests
**Tests that verify input validation and error conditions**

- `validation-error-conditions.tftest.hcl` - Tests error conditions
  - Invalid tier values
  - Invalid stack configurations
  - Subnet configuration validation
  - Minimum required variables
  - Edge cases and boundary conditions

### Legacy Tests
**Backward compatibility tests**

- `appservice.tftest.hcl` - Original comprehensive tests
  - Maintained for backward compatibility
  - Enhanced with additional assertions
  - Comprehensive integration scenarios

## Running Tests

### Run All Tests
```bash
terraform test
```

### Run Specific Test Files
```bash
terraform test -filter=unit-app-service-plan.tftest.hcl
terraform test -filter=integration-app-settings.tftest.hcl
terraform test -filter=validation-error-conditions.tftest.hcl
```

### Run Tests with Verbose Output
```bash
terraform test -verbose
```

### Run Tests in Parallel
```bash
terraform test -parallelism=5
```

## Test Coverage

The test suite covers:

### Core Functionality
- ✅ App Service Plan creation and configuration
- ✅ App Service configuration and security settings
- ✅ Networking (subnets, service endpoints, private endpoints)
- ✅ Staging slot creation and configuration
- ✅ Application settings management
- ✅ Application Insights integration
- ✅ Sticky settings functionality

### Tier Configurations
- ✅ Small tier (s) - Basic configuration, no staging slots
- ✅ Medium tier (m) - Standard configuration with staging slots
- ✅ Large tier (l) - Advanced configuration with all features
- ✅ Extra Large tier (xl) - Premium configuration
- ✅ Legacy tier mappings (test, standard, premium)

### Technology Stacks
- ✅ Node.js stack with version management
- ✅ Java stack with version management
- ✅ Application stack configuration validation

### Networking Scenarios
- ✅ Subnet creation with CIDR specification
- ✅ Custom subnet usage
- ✅ Service endpoints (CosmosDB, Storage, Web)
- ✅ Private endpoints for main app and staging slot
- ✅ DNS zone configuration

### Error Conditions
- ✅ Invalid tier values
- ✅ Invalid stack configurations
- ✅ Subnet configuration conflicts
- ✅ Missing required variables
- ✅ Edge cases and boundary conditions

### Module Outputs
- ✅ Subnet information
- ✅ App Service Plan details
- ✅ App Service configuration
- ✅ Staging slot information
- ✅ Private endpoint details
- ✅ Identity information

## Test Execution Strategy

### Development Workflow
1. **Unit Tests First** - Run unit tests during development for quick feedback
2. **Integration Tests** - Run integration tests to verify component interactions
3. **Validation Tests** - Run validation tests to ensure error handling
4. **Full Suite** - Run complete test suite before merging

### CI/CD Integration
The tests are designed to be run in CI/CD pipelines:
- Tests use `command = plan` for validation without actual resource creation
- Mock data and setup modules provide necessary test fixtures
- Tests are parallelizable for faster execution

## Test Maintenance

### Adding New Tests
1. Follow the existing naming convention (`unit-`, `integration-`, `validation-`)
2. Use the appropriate test category based on scope
3. Include comprehensive assertions with descriptive error messages
4. Add documentation for new test scenarios

### Updating Existing Tests
1. Maintain backward compatibility where possible
2. Update legacy tests when module behavior changes
3. Add new assertions for enhanced functionality
4. Keep test descriptions and error messages current

## Best Practices

### Test Organization
- Group related tests in the same file
- Use descriptive test names that indicate the scenario
- Include setup and teardown where needed
- Use consistent variable naming across tests

### Assertions
- Include comprehensive assertions for all critical functionality
- Use descriptive error messages that aid debugging
- Test both positive and negative scenarios
- Validate outputs and side effects

### Performance
- Use `command = plan` for validation tests
- Minimize resource creation in tests
- Use setup modules for common test infrastructure
- Leverage parallelism for faster execution

## Troubleshooting

### Common Issues
1. **Test Setup Failures** - Ensure setup module has correct permissions
2. **Assertion Failures** - Check variable names and expected values
3. **Resource Conflicts** - Use unique CIDR blocks and resource names
4. **Provider Issues** - Verify provider authentication and versions

### Debug Tips
1. Use `terraform test -verbose` for detailed output
2. Check individual test files with `-filter` option
3. Review assertion error messages for specific failures
4. Validate test variables and expected outcomes

## Future Enhancements

### Planned Additions
- Performance tests for large-scale deployments
- Security compliance tests
- Disaster recovery scenario tests
- Multi-region configuration tests
- Advanced monitoring and alerting tests

### Test Infrastructure
- Enhanced mock providers for unit tests
- Automated test data generation
- Test result reporting and metrics
- Integration with quality gates