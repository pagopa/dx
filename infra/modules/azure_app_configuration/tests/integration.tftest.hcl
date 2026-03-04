provider "azurerm" {
  features {}
}

provider "pagopa-dx" {}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "int"
    app_name        = "appcs"
    instance_number = "01"
  }

  tags = {
    BusinessUnit   = "DevEx"
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_app_configuration/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "App Configuration integration tests"
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

# Scenario 1: Default configuration (implicit standard SKU)
run "apply_default" {
  command = apply
  variables {
    environment                          = var.environment
    tags                                 = var.tags
    use_case                             = var.use_case
    resource_group_name                  = run.setup.resource_group_name
    virtual_network                      = run.setup.virtual_network
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
    subnet_pep_id                        = run.setup.subnet_pep_id
    size                                 = null
    key_vaults                           = null
    subscription_id                      = run.setup.subscription_id
    authorized_teams = {
      writers = []
      readers = []
    }
  }

  assert {
    condition     = azurerm_app_configuration.this.sku == "standard"
    error_message = "Default scenario must resolve SKU to standard"
  }
  assert {
    condition     = azurerm_app_configuration.this.public_network_access == "Disabled"
    error_message = "Public network access must be Disabled"
  }
  assert {
    condition     = azurerm_private_endpoint.app_config.private_service_connection[0].subresource_names[0] == "configurationStores"
    error_message = "Private endpoint subresource must be configurationStores"
  }
  assert {
    condition     = can(regex("privatelink\\.azconfig\\.io$", azurerm_private_endpoint.app_config.private_dns_zone_group[0].private_dns_zone_ids[0]))
    error_message = "DNS zone group must reference privatelink.azconfig.io"
  }
  assert {
    condition     = azurerm_app_configuration.this.purge_protection_enabled == true
    error_message = "Purge protection must be enabled"
  }
}

# Scenario 2: Explicit premium size
run "apply_premium" {
  command = apply
  variables {
    environment                          = merge(var.environment, { app_name = "appcs-prem" })
    tags                                 = var.tags
    use_case                             = var.use_case
    resource_group_name                  = run.setup.resource_group_name
    virtual_network                      = run.setup.virtual_network
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
    subnet_pep_id                        = run.setup.subnet_pep_id
    size                                 = "premium"
    key_vaults                           = null
    subscription_id                      = run.setup.subscription_id
    authorized_teams = {
      writers = []
      readers = []
    }
  }

  assert {
    condition     = azurerm_app_configuration.this.sku == "premium"
    error_message = "Premium scenario must set SKU to premium"
  }
  assert {
    condition     = azurerm_app_configuration.this.public_network_access == "Disabled"
    error_message = "Public network access must remain disabled"
  }
}

# Scenario 2: Explicit development size
run "apply_developer" {
  command = apply
  variables {
    environment                          = merge(var.environment, { app_name = "appcs-dev" })
    tags                                 = var.tags
    use_case                             = "development"
    resource_group_name                  = run.setup.resource_group_name
    virtual_network                      = run.setup.virtual_network
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
    subnet_pep_id                        = run.setup.subnet_pep_id
    key_vaults                           = null
    subscription_id                      = run.setup.subscription_id
    authorized_teams = {
      writers = []
      readers = []
    }
  }

  assert {
    condition     = azurerm_app_configuration.this.sku == "developer"
    error_message = "Development scenario must set SKU to developer"
  }
  assert {
    condition     = azurerm_app_configuration.this.public_network_access == "Disabled"
    error_message = "Public network access must remain disabled"
  }
}

# Scenario 4: Key Vault integration with application principal
run "apply_key_vault_integration" {
  command = apply
  variables {
    environment                          = merge(var.environment, { app_name = "appcs-kv" })
    tags                                 = var.tags
    use_case                             = var.use_case
    resource_group_name                  = run.setup.resource_group_name
    virtual_network                      = run.setup.virtual_network
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
    subnet_pep_id                        = run.setup.subnet_pep_id
    size                                 = null
    subscription_id                      = run.setup.subscription_id
    key_vaults = [
      {
        name                = run.setup.key_vaults[0].name
        resource_group_name = run.setup.key_vaults[0].resource_group_name
        has_rbac_support    = run.setup.key_vaults[0].has_rbac_support
        app_principal_ids   = [run.setup.managed_identity_principal_id]
      }
    ]
    authorized_teams = {
      writers = []
      readers = []
    }
  }

  assert {
    condition     = azurerm_app_configuration.this.identity[0].principal_id != null
    error_message = "Managed identity principal id must be present for KV integration"
  }
  assert {
    condition     = length(azurerm_role_assignment.app_kv_secrets_user) == 1
    error_message = "One Key Vault role assignment must be created for the managed identity"
  }
  assert {
    condition     = length(azurerm_role_assignment.app_appconfig_reader) == 1
    error_message = "One App Configuration role assignment must be created for the managed identity"
  }
  assert {
    condition     = length(local.app_principal_assignments) == 1
    error_message = "App Configuration identity must be assigned to Key Vault"
  }
}
