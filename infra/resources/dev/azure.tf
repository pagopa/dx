module "azure_core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = local.core_state
}

module "ai_foundry" {
  source = "../_modules/ai_foundry"

  environment         = merge(local.environment, { app_name = "ai" })
  resource_group_name = data.azurerm_resource_group.ai.name

  tags = local.tags
}
