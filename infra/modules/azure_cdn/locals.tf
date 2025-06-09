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
}
