provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    storage_use_azuread = true
  }
}

provider "dx" {}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "int"
    app_name        = "sa"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_storage_account/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Storage Account integration tests"
  }

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

# Scenario 1: Default configuration (private endpoints, ZRS, shared key)
run "apply_default" {
  command = apply

  variables {
    environment                          = var.environment
    tags                                 = var.tags
    resource_group_name                  = run.setup.resource_group_name
    use_case                             = "default"
    subnet_pep_id                        = run.setup.subnet_pep_id
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
  }

  assert {
    condition     = azurerm_storage_account.this.account_tier == "Standard"
    error_message = "account_tier must be Standard for default use case"
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "ZRS"
    error_message = "account_replication_type must be ZRS for default use case"
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == false
    error_message = "public_network_access_enabled must be false for default use case"
  }

  assert {
    condition     = can(azurerm_private_endpoint.this["blob"])
    error_message = "Private endpoint for blob must be created"
  }
}

# Scenario 2: Development use case (LRS, public access)
run "apply_development" {
  command = apply

  variables {
    environment                         = merge(var.environment, { app_name = "sadev" })
    tags                                = var.tags
    resource_group_name                 = run.setup.resource_group_name
    use_case                            = "development"
    force_public_network_access_enabled = true
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "LRS"
    error_message = "account_replication_type must be LRS for development use case"
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == true
    error_message = "public_network_access_enabled must be true for development use case with force_public=true"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.storage_account_health_check) == 0
    error_message = "no alerts must be created for development use case"
  }
}

# Scenario 3: Delegated access (no shared key, public, defender enabled)
run "apply_delegated_access" {
  command = apply

  variables {
    environment         = merge(var.environment, { app_name = "sada" })
    tags                = var.tags
    resource_group_name = run.setup.resource_group_name
    use_case            = "delegated_access"
  }

  assert {
    condition     = azurerm_storage_account.this.shared_access_key_enabled == false
    error_message = "shared_access_key_enabled must be false for delegated_access use case"
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == true
    error_message = "public_network_access_enabled must be true for delegated_access use case"
  }

  assert {
    condition     = length(azurerm_security_center_storage_defender.this) == 1
    error_message = "Defender must be enabled for delegated_access use case"
  }
}

# Scenario 4: Force public network (defender enabled, no private endpoints)
run "apply_public_network" {
  command = apply

  variables {
    environment                         = merge(var.environment, { app_name = "sapub" })
    tags                                = var.tags
    resource_group_name                 = run.setup.resource_group_name
    use_case                            = "default"
    force_public_network_access_enabled = true
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == true
    error_message = "public_network_access_enabled must be true when force_public=true"
  }

  assert {
    condition     = length(azurerm_private_endpoint.this) == 0
    error_message = "No private endpoints must be created when public network is forced"
  }

  assert {
    condition     = length(azurerm_security_center_storage_defender.this) == 1
    error_message = "Defender must be enabled when public network is forced"
  }
}
