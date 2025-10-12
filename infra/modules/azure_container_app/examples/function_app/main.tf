resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "example",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

data "azurerm_subscription" "current" {}

data "azurerm_virtual_network" "common" {
  name                = local.virtual_network.name
  resource_group_name = data.azurerm_resource_group.network.name
}

data "azurerm_resource_group" "network" {
  name = local.virtual_network.resource_group_name
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_key_vault" "common" {
  name                = "dx-d-itn-common-kv-01"
  resource_group_name = "dx-d-itn-common-rg-01"
}

data "azurerm_log_analytics_workspace" "common" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "common",
    resource_type = "log_analytics"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "",
    name          = "common",
    resource_type = "resource_group"
  }))
}

data "azurerm_application_insights" "common" {
  name                = "dx-d-itn-common-appi-01"
  resource_group_name = "dx-d-itn-common-rg-01"
}

resource "dx_available_subnet_cidr" "next_cidr" {
  virtual_network_id = data.azurerm_virtual_network.common.id
  prefix_length      = 23
}

module "container_app_environment" {
  source = "../../../azure_container_app_environment"

  environment         = merge(local.environment, { instance_number = "02" })
  resource_group_name = azurerm_resource_group.example.name

  log_analytics_workspace_id = data.azurerm_log_analytics_workspace.common.id

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = dx_available_subnet_cidr.next_cidr.cidr_block

  tags = local.tags
}

module "container_app" {
  source = "../../"

  environment         = merge(local.environment, { instance_number = "05" })
  resource_group_name = azurerm_resource_group.example.name

  function_settings = {
    key_vault_name                         = data.azurerm_key_vault.common.name
    has_durable_functions                  = false
    subnet_pep_id                          = data.azurerm_subnet.pep.id
    private_dns_zone_resource_group_id     = data.azurerm_resource_group.network.id
    application_insights_connection_string = data.azurerm_application_insights.common.connection_string
  }

  tier          = "m"
  revision_mode = "Single"
  target_port   = 80
  container_app_templates = [
    {
      image = "ghcr.io/pagopa/dotnetfunc:latest"
      name  = "dotnet"

      liveness_probe = {
        path = "/"
      }
    },
  ]

  autoscaler = {
    replicas = {
      minimum = 0
      maximum = 10
    }
  }

  container_app_environment_id = module.container_app_environment.id
  user_assigned_identity_id    = module.container_app_environment.user_assigned_identity.id

  tags = local.tags
}

module "ca_kv" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  subscription_id = data.azurerm_subscription.current.subscription_id
  principal_id    = module.container_app.principal_id

  key_vault = [
    {
      name                = data.azurerm_key_vault.common.name
      resource_group_name = data.azurerm_key_vault.common.resource_group_name
      has_rbac_support    = true
      description         = "Allow Container App to write function keys"
      roles = {
        secrets = "writer"
      }
    }
  ]
}
