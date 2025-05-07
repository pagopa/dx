locals {
  tags = merge(var.tags, { module_version = try(jsondecode(file("${path.module}/package.json")).version, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    instance_number = tonumber(var.environment.instance_number),
  }

  env_name = {
    "d" = "dev"
    "u" = "uat"
    "p" = "prod"
  }[var.environment.env_short]

  resource_group_name = var.resource_group_name
  #e.g. dx-d-itn-test-app-github-cd-id-01
  identity_name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = var.environment.domain
    name          = "%s-github-%s"
    resource_type = "managed_identity"
  }))
  #e.g. dx-environment-app-prod-cd
  federation_prefix = "${var.repository.name}-environment-%s-${local.env_name}-%s"

  is_ci_enabled = var.continuos_integration.enable ? 1 : 0
  is_cd_enabled = var.continuos_delivery.enable ? 1 : 0

  ci_github_federations = local.is_ci_enabled == 1 ? {
    audience = ["api://AzureADTokenExchange"]
    issuer   = "https://token.actions.githubusercontent.com"
    # repo:pagopa/dx:environment:app-prod-ci
    subject = format("repo:${var.repository.owner}/${var.repository.name}:environment:%s-${local.env_name}-ci", var.identity_type)
  } : null

  cd_github_federations = local.is_cd_enabled == 1 ? {
    audience = ["api://AzureADTokenExchange"]
    issuer   = "https://token.actions.githubusercontent.com"
    # repo:pagopa/dx:environment:app-prod-cd
    subject = format("repo:${var.repository.owner}/${var.repository.name}:environment:%s-${local.env_name}-cd", var.identity_type)
  } : null

  ci_rg_roles = var.continuos_integration.enable ? tolist(flatten([
    for rg in data.azurerm_resource_group.ci_details : [
      for role in var.continuos_integration.roles.resource_groups[rg.name] : {
        resource_group_id = rg.id
        role_name         = role
      }
    ]
  ])) : []

  cd_rg_roles = var.continuos_delivery.enable ? tolist(flatten([
    for rg in data.azurerm_resource_group.cd_details : [
      for role in var.continuos_delivery.roles.resource_groups[rg.name] : {
        resource_group_id = rg.id
        role_name         = role
      }
    ]
  ])) : []
}
