locals {
  location_short = {
    italynorth  = "itn"
    westeurope  = "weu"
    northeurope = "neu"
  }[var.environment.location]

  account_name = "${var.environment.prefix}-${var.environment.environment}-${local.location_short}-aif-${var.environment.instance_number}"
  project_name = "${var.environment.prefix}-${var.environment.environment}-${local.location_short}-terraformci-proj-${var.environment.instance_number}"

  private_endpoint_name = provider::azuredx::resource_name(merge(var.environment, {
    app_name      = "foundry"
    resource_type = "private_endpoint"
  }))

  private_dns_zones = {
    cognitive_services = "privatelink.cognitiveservices.azure.com"
    openai             = "privatelink.openai.azure.com"
    services_ai        = "privatelink.services.ai.azure.com"
  }
}

resource "azurerm_cognitive_account" "this" {
  name                = local.account_name
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  identity {
    type = "SystemAssigned"
  }

  kind     = "AIServices"
  sku_name = "S0"

  project_management_enabled = true
  custom_subdomain_name      = local.account_name

  local_auth_enabled            = false
  public_network_access_enabled = false

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
  }

  tags = var.tags
}

resource "azurerm_private_dns_zone" "foundry" {
  for_each = local.private_dns_zones

  name                = each.value
  resource_group_name = var.virtual_network.resource_group_name

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "foundry" {
  for_each = azurerm_private_dns_zone.foundry

  name                  = var.virtual_network.name
  resource_group_name   = var.virtual_network.resource_group_name
  private_dns_zone_name = each.value.name
  virtual_network_id    = var.virtual_network.id
  registration_enabled  = false

  tags = var.tags
}

resource "azurerm_private_endpoint" "foundry" {
  name                = local.private_endpoint_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = local.private_endpoint_name
    private_connection_resource_id = azurerm_cognitive_account.this.id
    is_manual_connection           = false
    subresource_names              = ["account"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = values(azurerm_private_dns_zone.foundry)[*].id
  }

  tags = var.tags
}

resource "azurerm_cognitive_account_project" "terraform_ci" {
  name     = local.project_name
  location = var.environment.location

  cognitive_account_id = azurerm_cognitive_account.this.id
  description          = "Enforce rules at CI stage"
  display_name         = "Terraform CI"

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}

resource "azurerm_cognitive_deployment" "this" {
  name                 = "gpt-5-5"
  cognitive_account_id = azurerm_cognitive_account.this.id

  model {
    format  = "OpenAI"
    name    = "gpt-5.5"
    version = "2026-04-24"
  }

  sku {
    name     = "GlobalStandard"
    capacity = 100
  }
}
