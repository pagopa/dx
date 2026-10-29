# Module Under Test - the Azure CDN module being validated

module "azure_cdn" {
  source = "../.." # Use local path to test latest code changes in the module

  resource_group_name = azurerm_resource_group.e2e.name

  environment = local.environment

  # WAF is already enabled on the profile, create security policy for this endpoint
  waf_enabled = true

  origins = {
    primary = {
      host_name = azurerm_storage_account.cdn_origin.primary_web_host
      priority  = 1
    }
  }

  tags = local.tags

  depends_on = [
    azurerm_storage_account_static_website.cdn_origin
  ]
}
