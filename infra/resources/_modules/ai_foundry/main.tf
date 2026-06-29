locals {
  location_short = {
    italynorth  = "itn"
    westeurope  = "weu"
    northeurope = "neu"
  }[var.environment.location]

  account_name = "${var.environment.prefix}-${var.environment.environment}-${local.location_short}-aif-${var.environment.instance_number}"
  project_name = "${var.environment.prefix}-${var.environment.environment}-${local.location_short}-terraformci-proj-${var.environment.instance_number}"
}

# trivy:ignore:AZU-0012 No network rules defined and default action allows access.
# trivy:ignore:AZU-0057 Storage account does not have logging enabled for any service.
# trivy:ignore:AZU-0058 Storage account does not use geo-redundant replication.
# trivy:ignore:AZU-0061 Storage account does not have infrastructure encryption enabled.
resource "azurerm_storage_account" "foundry" {
  name = provider::azuredx::resource_name(merge(var.environment,
    {
      domain        = var.environment.domain
      app_name      = var.environment.app_name
      resource_type = "storage_account",
  }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  allow_nested_items_to_be_public = false
  default_to_oauth_authentication = true
  shared_access_key_enabled       = false

  identity {
    type = "SystemAssigned"
  }

  network_rules {
    default_action = "Allow" # TODO: change
    bypass         = ["AzureServices", "Logging", "Metrics"]
  }

  tags = var.tags
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
  public_network_access_enabled = true

  # network_acls {
  #   default_action = "Deny"
  #   bypass         = ["AzureServices"]
  # }

  # network_injection {

  # }

  # outbound_network_access_restricted {

  # }

  storage {
    storage_account_id = azurerm_storage_account.foundry.id
    # identity_client_id = azurerm_storage_account.foundry.identity[0].principal_id
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
    capacity = 10
  }
}

# Grant the AI gateway managed identity inference access on the account.
resource "azurerm_role_assignment" "openai_user" {
  for_each = toset(var.ai_user_principal_ids)

  scope                = azurerm_cognitive_account.this.id
  role_definition_name = "Cognitive Services OpenAI User" # TODO: change
  principal_id         = each.value
}

resource "azurerm_role_assignment" "foundry_storage_blob_contributor" {
  scope                = azurerm_storage_account.foundry.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_cognitive_account.this.identity[0].principal_id
  description          = "Allow Foundry to access the Storage Account for model storage and inference"
}
