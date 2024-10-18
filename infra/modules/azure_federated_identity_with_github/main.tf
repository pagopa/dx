terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.86"
    }
  }
}

module "federated_ci_identity" {
  count = var.continuos_integration.enable == true ? 1 : 0

  source = "github.com/pagopa/terraform-azurerm-v3//github_federated_identity?ref=identity-location"

  prefix    = var.prefix
  env_short = var.env_short
  domain    = var.domain
  location  = var.location

  identity_role = "ci"

  github_federations = local.ci_github_federations

  ci_rbac_roles = {
    subscription_roles = var.continuos_integration.roles.subscription
    resource_groups    = var.continuos_integration.roles.resource_groups
  }

  tags = var.tags
}

module "federated_cd_identity" {
  count = var.continuos_delivery.enable == true ? 1 : 0

  source = "github.com/pagopa/terraform-azurerm-v3//github_federated_identity?ref=identity-location"

  prefix    = var.prefix
  env_short = var.env_short
  domain    = var.domain
  location  = var.location

  identity_role = "cd"

  github_federations = local.cd_github_federations

  cd_rbac_roles = {
    subscription_roles = var.continuos_delivery.roles.subscription
    resource_groups    = var.continuos_delivery.roles.resource_groups
  }

  tags = var.tags
}
