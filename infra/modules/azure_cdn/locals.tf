locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  create_profile      = var.existing_cdn_frontdoor_profile_id == null
  profile_id          = local.create_profile ? azurerm_cdn_frontdoor_profile.this[0].id : var.existing_cdn_frontdoor_profile_id
  profile_name        = local.create_profile ? azurerm_cdn_frontdoor_profile.this[0].name : data.azurerm_cdn_frontdoor_profile.existing[0].name
  profile_identity_id = local.create_profile ? azurerm_cdn_frontdoor_profile.this[0].identity[0].principal_id : data.azurerm_cdn_frontdoor_profile.existing[0].identity[0].principal_id

  is_apex = {
    for cd in var.custom_domains : cd.host_name => (cd.host_name == cd.dns.zone_name)
  }

  # Create a map of unique key vaults with RBAC support using grouping
  unique_key_vaults_rbac = {
    for custom_domain in var.custom_domains :
    "${custom_domain.custom_certificate.key_vault_name}:${custom_domain.custom_certificate.key_vault_resource_group_name}" => custom_domain...
    if lookup(local.is_apex, custom_domain.host_name, false) && custom_domain.custom_certificate.key_vault_has_rbac_support
  }

  # Create a map of unique key vaults without RBAC support using grouping
  unique_key_vaults_no_rbac = {
    for custom_domain in var.custom_domains :
    "${custom_domain.custom_certificate.key_vault_name}:${custom_domain.custom_certificate.key_vault_resource_group_name}" => custom_domain...
    if lookup(local.is_apex, custom_domain.host_name, false) && !custom_domain.custom_certificate.key_vault_has_rbac_support
  }

  # Map of origins that use managed identity to set RBAC
  # Filter based only on use_managed_identity flag to avoid "known after apply" issues
  origins_with_rbac = {
    for k, v in var.origins : k => v if v.use_managed_identity
  }

  # Define existing CDN FrontDoor profile resource ID parts
  existing_cdn_frontdoor_profile_match = var.existing_cdn_frontdoor_profile_id != null ? provider::azurerm::parse_resource_id(var.existing_cdn_frontdoor_profile_id) : null

  # Check if existing Profile SKU is compatible with WAF
  compatible_sku = var.existing_cdn_frontdoor_profile_id != null ? data.azurerm_cdn_frontdoor_profile.existing[0].sku_name == "Standard_AzureFrontDoor" : true
}
