module "payments_storage" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 3.0"

  environment         = local.payments_environment
  resource_group_name = module.azure_core_values.common_resource_group_name
  use_case            = "development"

  force_public_network_access_enabled  = false
  subnet_pep_id                        = module.azure_core_values.common_pep_snet.id
  private_dns_zone_resource_group_name = module.azure_core_values.network_resource_group_name

  subservices_enabled = {
    blob = true
  }

  tags = local.tags
}
