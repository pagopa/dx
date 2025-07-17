# Integration tests for module outputs
# Tests that all outputs provide the expected values

provider "azurerm" {
  features {}
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }
}

# Test outputs with created subnet
run "outputs_with_created_subnet" {
  command = plan

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
      Test = "integration-test-outputs-created-subnet"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.110.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  # Test subnet output
  assert {
    condition     = output.subnet.id == azurerm_subnet.this[0].id
    error_message = "Subnet output ID should match created subnet ID"
  }

  assert {
    condition     = output.subnet.name == azurerm_subnet.this[0].name
    error_message = "Subnet output name should match created subnet name"
  }

  # Test app_service output structure
  assert {
    condition     = output.app_service.resource_group_name == run.setup_tests.resource_group_name
    error_message = "App service output should have correct resource group name"
  }

  assert {
    condition     = output.app_service.plan.id == azurerm_service_plan.this[0].id
    error_message = "App service plan output ID should match created plan ID"
  }

  assert {
    condition     = output.app_service.plan.name == azurerm_service_plan.this[0].name
    error_message = "App service plan output name should match created plan name"
  }

  assert {
    condition     = output.app_service.app_service.id == azurerm_linux_web_app.this.id
    error_message = "App service output ID should match created app service ID"
  }

  assert {
    condition     = output.app_service.app_service.name == azurerm_linux_web_app.this.name
    error_message = "App service output name should match created app service name"
  }

  assert {
    condition     = output.app_service.app_service.principal_id == azurerm_linux_web_app.this.identity[0].principal_id
    error_message = "App service output principal ID should match identity principal ID"
  }

  assert {
    condition     = length(output.app_service.app_service.pep_record_sets) > 0
    error_message = "App service output should have private endpoint record sets"
  }

  # Test staging slot output
  assert {
    condition     = output.app_service.app_service.slot.id == azurerm_linux_web_app_slot.this[0].id
    error_message = "Staging slot output ID should match created slot ID"
  }

  assert {
    condition     = output.app_service.app_service.slot.name == azurerm_linux_web_app_slot.this[0].name
    error_message = "Staging slot output name should match created slot name"
  }

  assert {
    condition     = output.app_service.app_service.slot.principal_id == azurerm_linux_web_app_slot.this[0].identity[0].principal_id
    error_message = "Staging slot output principal ID should match identity principal ID"
  }

  assert {
    condition     = length(output.app_service.app_service.slot.pep_record_sets) > 0
    error_message = "Staging slot output should have private endpoint record sets"
  }
}

# Test outputs with existing subnet
run "outputs_with_existing_subnet" {
  command = plan

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
      Test = "integration-test-outputs-existing-subnet"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_id                            = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  # Test subnet output with existing subnet
  assert {
    condition     = output.subnet.id == run.setup_tests.pep_id
    error_message = "Subnet output ID should match provided subnet ID"
  }

  assert {
    condition     = output.subnet.name == null
    error_message = "Subnet output name should be null when using existing subnet"
  }

  # Test app_service output structure is still correct
  assert {
    condition     = output.app_service.resource_group_name == run.setup_tests.resource_group_name
    error_message = "App service output should have correct resource group name"
  }

  assert {
    condition     = output.app_service.plan.id == azurerm_service_plan.this[0].id
    error_message = "App service plan output ID should match created plan ID"
  }

  assert {
    condition     = output.app_service.app_service.id == azurerm_linux_web_app.this.id
    error_message = "App service output ID should match created app service ID"
  }
}

# Test outputs with existing app service plan
run "outputs_with_existing_plan" {
  command = plan

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
      Test = "integration-test-outputs-existing-plan"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"
    app_service_plan_id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/existing-plan"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.111.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  # Test app service plan output with existing plan
  assert {
    condition     = output.app_service.plan.id == "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/existing-plan"
    error_message = "App service plan output ID should match provided plan ID"
  }

  assert {
    condition     = output.app_service.plan.name == null
    error_message = "App service plan output name should be null when using existing plan"
  }

  # Test app_service output structure is still correct
  assert {
    condition     = output.app_service.app_service.id == azurerm_linux_web_app.this.id
    error_message = "App service output ID should match created app service ID"
  }
}

# Test outputs with small tier (no staging slot)
run "outputs_small_tier_no_slot" {
  command = plan

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
      Test = "integration-test-outputs-small-tier"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "s"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.112.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  # Test staging slot output is null for small tier
  assert {
    condition     = output.app_service.app_service.slot.id == null
    error_message = "Staging slot output ID should be null for small tier"
  }

  assert {
    condition     = output.app_service.app_service.slot.name == null
    error_message = "Staging slot output name should be null for small tier"
  }

  assert {
    condition     = output.app_service.app_service.slot.principal_id == null
    error_message = "Staging slot output principal ID should be null for small tier"
  }

  assert {
    condition     = output.app_service.app_service.slot.pep_record_sets == null
    error_message = "Staging slot output record sets should be null for small tier"
  }

  # Test main app service output is still correct
  assert {
    condition     = output.app_service.app_service.id == azurerm_linux_web_app.this.id
    error_message = "App service output ID should match created app service ID"
  }

  assert {
    condition     = output.app_service.app_service.name == azurerm_linux_web_app.this.name
    error_message = "App service output name should match created app service name"
  }

  assert {
    condition     = output.app_service.app_service.principal_id == azurerm_linux_web_app.this.identity[0].principal_id
    error_message = "App service output principal ID should match identity principal ID"
  }
}

# Test outputs with all optional features enabled
run "outputs_full_configuration" {
  command = plan

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
      Test = "integration-test-outputs-full-config"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "xl"
    stack               = "java"
    java_version        = "21"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.113.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    subnet_service_endpoints = {
      cosmos  = true
      storage = true
      web     = false
    }

    application_insights_connection_string = "InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://westeurope-1.in.applicationinsights.azure.com/"

    app_settings = {
      "JAVA_OPTS"     = "-Xmx4g -Xms2g"
      "ENVIRONMENT"   = "production"
    }

    slot_app_settings = {
      "ENVIRONMENT"   = "staging"
    }

    sticky_app_setting_names = [
      "ENVIRONMENT"
    ]

    health_check_path = "/actuator/health"
  }

  # Test all output fields are populated correctly
  assert {
    condition     = output.subnet.id == azurerm_subnet.this[0].id
    error_message = "Subnet output ID should be populated"
  }

  assert {
    condition     = output.subnet.name == azurerm_subnet.this[0].name
    error_message = "Subnet output name should be populated"
  }

  assert {
    condition     = output.app_service.resource_group_name == run.setup_tests.resource_group_name
    error_message = "Resource group name should be populated"
  }

  assert {
    condition     = output.app_service.plan.id == azurerm_service_plan.this[0].id
    error_message = "App service plan ID should be populated"
  }

  assert {
    condition     = output.app_service.plan.name == azurerm_service_plan.this[0].name
    error_message = "App service plan name should be populated"
  }

  assert {
    condition     = output.app_service.app_service.id == azurerm_linux_web_app.this.id
    error_message = "App service ID should be populated"
  }

  assert {
    condition     = output.app_service.app_service.name == azurerm_linux_web_app.this.name
    error_message = "App service name should be populated"
  }

  assert {
    condition     = output.app_service.app_service.principal_id == azurerm_linux_web_app.this.identity[0].principal_id
    error_message = "App service principal ID should be populated"
  }

  assert {
    condition     = length(output.app_service.app_service.pep_record_sets) > 0
    error_message = "App service private endpoint record sets should be populated"
  }

  assert {
    condition     = output.app_service.app_service.slot.id == azurerm_linux_web_app_slot.this[0].id
    error_message = "Staging slot ID should be populated"
  }

  assert {
    condition     = output.app_service.app_service.slot.name == azurerm_linux_web_app_slot.this[0].name
    error_message = "Staging slot name should be populated"
  }

  assert {
    condition     = output.app_service.app_service.slot.principal_id == azurerm_linux_web_app_slot.this[0].identity[0].principal_id
    error_message = "Staging slot principal ID should be populated"
  }

  assert {
    condition     = length(output.app_service.app_service.slot.pep_record_sets) > 0
    error_message = "Staging slot private endpoint record sets should be populated"
  }

  # Test that the output values are strings (not null or empty)
  assert {
    condition     = length(output.app_service.app_service.id) > 0
    error_message = "App service ID should not be empty"
  }

  assert {
    condition     = length(output.app_service.app_service.name) > 0
    error_message = "App service name should not be empty"
  }

  assert {
    condition     = length(output.app_service.app_service.principal_id) > 0
    error_message = "App service principal ID should not be empty"
  }
}