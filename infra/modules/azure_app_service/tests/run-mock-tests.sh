# Example of how to run tests with mock data for development
# This file shows how to configure tests to run without Azure authentication

# Set up mock test environment
export TF_VAR_use_mock_data=true
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_SECRET="fake-secret"
export ARM_USE_CLI=false
export ARM_USE_MSI=false
export ARM_SKIP_PROVIDER_REGISTRATION=true

# Initialize terraform
terraform init

# Validate configuration
terraform validate

# Run tests with mock data
terraform test -verbose

# Run specific test categories
terraform test -filter=unit-*
terraform test -filter=integration-*
terraform test -filter=validation-*

# Run with JSON output for CI/CD
terraform test -json > test-results.json