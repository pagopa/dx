# Module Under Test - the Azure CDN module being validated

module "azure_cdn" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.5"

  resource_group_name = azurerm_resource_group.e2e.name

  environment = local.environment

  # WAF is already enabled on the profile, create security policy for this endpoint
  waf_enabled = true

  origins = {
    primary = {
      host_name = module.storage_account.primary_web_host
      priority  = 1
    }
  }

  tags = local.tags
}
