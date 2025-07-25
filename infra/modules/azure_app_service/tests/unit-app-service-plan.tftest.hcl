# Unit tests for App Service Plan component
# Tests different tier configurations and plan creation logic

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

# Test App Service Plan creation with small tier
run "app_service_plan_small_tier" {
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
      Test = "unit-test-plan-small"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "s"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.51.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "B1"
    error_message = "Small tier should use B1 SKU"
  }

  assert {
    condition     = azurerm_service_plan.this[0].zone_balancing_enabled == false
    error_message = "Small tier should not have zone balancing enabled"
  }

  assert {
    condition     = azurerm_service_plan.this[0].os_type == "Linux"
    error_message = "App Service Plan should be Linux"
  }

  assert {
    condition     = length(azurerm_linux_web_app_slot.this) == 0
    error_message = "Small tier should not have staging slots"
  }
}

# Test App Service Plan creation with medium tier
run "app_service_plan_medium_tier" {
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
      Test = "unit-test-plan-medium"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.52.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P0v3"
    error_message = "Medium tier should use P0v3 SKU"
  }

  assert {
    condition     = azurerm_service_plan.this[0].zone_balancing_enabled == true
    error_message = "Medium tier should have zone balancing enabled"
  }

  assert {
    condition     = length(azurerm_linux_web_app_slot.this) == 1
    error_message = "Medium tier should have staging slots"
  }
}

# Test App Service Plan creation with large tier
run "app_service_plan_large_tier" {
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
      Test = "unit-test-plan-large"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.53.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "Large tier should use P1v3 SKU"
  }

  assert {
    condition     = azurerm_service_plan.this[0].zone_balancing_enabled == true
    error_message = "Large tier should have zone balancing enabled"
  }
}

# Test App Service Plan creation with extra large tier
run "app_service_plan_xl_tier" {
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
      Test = "unit-test-plan-xl"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "xl"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.54.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P2v3"
    error_message = "XL tier should use P2v3 SKU"
  }

  assert {
    condition     = azurerm_service_plan.this[0].zone_balancing_enabled == true
    error_message = "XL tier should have zone balancing enabled"
  }
}

# Test legacy tier mappings
run "app_service_plan_legacy_tiers" {
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
      Test = "unit-test-plan-legacy"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "test"  # Legacy tier that maps to "s"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.55.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "B1"
    error_message = "Legacy 'test' tier should map to B1 SKU"
  }

  assert {
    condition     = azurerm_service_plan.this[0].zone_balancing_enabled == false
    error_message = "Legacy 'test' tier should not have zone balancing enabled"
  }
}

# Test when using existing App Service Plan
run "app_service_plan_existing" {
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
      Test = "unit-test-plan-existing"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"
    app_service_plan_id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/existing-plan"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.56.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_service_plan.this) == 0
    error_message = "No App Service Plan should be created when using existing plan"
  }

  assert {
    condition     = azurerm_linux_web_app.this.service_plan_id == "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/existing-plan"
    error_message = "App Service should use the provided existing plan ID"
  }
}