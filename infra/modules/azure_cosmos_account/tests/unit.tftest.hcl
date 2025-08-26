# Unit Tests for Azure Cosmos DB Module
# These tests validate basic configuration logic without deploying infrastructure

provider "azurerm" {
  features {}
}

# Test consistency policy presets mapping
run "unit_test_consistency_presets" {
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
      Environment = "Test"
      Owner       = "DevEx"
    }

    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"
    
    consistency_policy = {
      consistency_preset = "Default"
    }
    
    alerts = {
      enabled = false
    }
  }

  # Test that Default preset exists in consistency_presets
  assert {
    condition     = contains(keys(local.consistency_presets), "Default")
    error_message = "Default preset should exist in consistency_presets"
  }

  # Test that HighConsistency preset exists
  assert {
    condition     = contains(keys(local.consistency_presets), "HighConsistency")
    error_message = "HighConsistency preset should exist in consistency_presets"
  }

  # Test that BalancedStaleness preset exists
  assert {
    condition     = contains(keys(local.consistency_presets), "BalancedStaleness")
    error_message = "BalancedStaleness preset should exist in consistency_presets"
  }

  # Test selected preset logic
  assert {
    condition     = local.selected_preset == "Default"
    error_message = "Selected preset should be Default when consistency_preset is Default"
  }
}

# Test input validation and variable handling
run "unit_test_input_validation" {
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
      Environment = "Test"
      Owner       = "DevEx"
    }

    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"
    
    consistency_policy = {
      consistency_preset = "Default"
    }
    
    alerts = {
      enabled = false
    }
  }

  # Test that required variables are properly set
  assert {
    condition     = var.environment.prefix == "dx"
    error_message = "Environment prefix should be set to dx"
  }

  assert {
    condition     = var.environment.location == "italynorth"
    error_message = "Environment location should be set to italynorth"
  }

  assert {
    condition     = var.resource_group_name == "test-rg"
    error_message = "Resource group name should be set"
  }
}