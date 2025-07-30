locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    app_name        = "test"
    instance_number = "01"
  }

  naming_config = {
    prefix          = local.environment.prefix,
    environment     = local.environment.env_short,
    location        = local.environment.location
    name            = local.environment.app_name,
    instance_number = tonumber(local.environment.instance_number),
  }

  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/resources/dev"
    ManagementTeam = "Developer Experience"
  }
}

variable "enable_cdn" {
  type        = bool
  description = "Enable or disable CDN for the static web app"
  default     = true
}

resource "azurerm_static_web_app" "test" {
  configuration_file_changes_enabled = true
  location                           = "westeurope"
  name                               = provider::dx::resource_name(merge(local.naming_config, {
    domain = "static-app"
    name          = "test",
    resource_type = "app_service"
  }))
  preview_environments_enabled       = true
  public_network_access_enabled      = true
  # repository_branch                  = "feat-dx-docs-on-static-app-poc" # main
  # repository_url                     = "https://github.com/pagopa/dx"
  resource_group_name                = local.resource_group_name
  sku_size                           = "Standard"
  sku_tier                           = "Standard"

  tags                               = local.tags
}

resource "null_resource" "enable_enterprise_edge" {
  count = var.enable_cdn ? 1 : 0
  triggers = {
    static_web_app_id = azurerm_static_web_app.test.id
  }

  provisioner "local-exec" {
    command = "az staticwebapp enterprise-edge enable --name ${azurerm_static_web_app.test.name} --resource-group ${azurerm_static_web_app.test.resource_group_name}"

    interpreter = ["bash", "-c"]
  }

  depends_on = [azurerm_static_web_app.test]
}

resource "null_resource" "disable_enterprise_edge" {
  count = var.enable_cdn ? 0 : 1
  triggers = {
    static_web_app_id = azurerm_static_web_app.test.id
  }

  provisioner "local-exec" {
    command = "az staticwebapp enterprise-edge disable --name ${azurerm_static_web_app.test.name} --resource-group ${azurerm_static_web_app.test.resource_group_name}"

    interpreter = ["bash", "-c"]
  }

  depends_on = [azurerm_static_web_app.test]
}

data "azurerm_key_vault" "key_vault" {
  resource_group_name = "dx-d-itn-common-rg-01"
  name                = "dx-d-itn-common-kv-01"
}

resource "azurerm_key_vault_secret" "api_key_test" {
  name         = "static-web-app-api-key"
  value        = azurerm_static_web_app.test.api_key

  key_vault_id = data.azurerm_key_vault.key_vault.id
}