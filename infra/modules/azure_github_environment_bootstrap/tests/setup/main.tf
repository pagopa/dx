terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~>2"
    }

    github = {
      source  = "integrations/github"
      version = "~>6"
    }
  }
}

data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azurerm_container_app_environment" "runner" {
  name                = local.runner.cae_name
  resource_group_name = local.runner.cae_resource_group_name
}

data "azurerm_virtual_network" "common" {
  name                = local.vnet.name
  resource_group_name = local.vnet.resource_group_name
}

data "azurerm_resource_group" "dashboards" {
  name = "dashboards"
}

data "azurerm_resource_group" "external" {
  name = local.dns.resource_group_name
}

data "azuread_group" "admins" {
  display_name = local.adgroups.admins_name
}

data "azuread_group" "developers" {
  display_name = local.adgroups.devs_name
}

data "azuread_group" "externals" {
  display_name = local.adgroups.external_name
}

output "environment" {
  value = {
    prefix          = local.environment.prefix
    env_short       = local.environment.env_short
    location        = local.environment.location
    domain          = local.environment.domain
    app_name        = local.environment.app_name
    instance_number = local.environment.instance_number
  }
}

output "subscription_id" {
  value = data.azurerm_subscription.current.id
}

output "tenant_id" {
  value = data.azurerm_client_config.current.tenant_id
}

output "entraid_groups" {
  value = {
    admins_object_id    = data.azuread_group.admins.object_id
    devs_object_id      = data.azuread_group.developers.object_id
    externals_object_id = data.azuread_group.externals.object_id
  }
}

output "terraform_storage_account" {
  value = {
    name                = local.tf_storage_account.name
    resource_group_name = local.tf_storage_account.resource_group_name
  }
}

output "repository" {
  value = {
    name               = local.repository.name
    description        = local.repository.description
    topics             = local.repository.topics
    reviewers_teams    = local.repository.reviewers_teams
    app_cd_policy_tags = local.repository.app_cd_policy_tags
  }
}

output "github_private_runner" {
  value = {
    container_app_environment_id       = data.azurerm_container_app_environment.runner.id
    container_app_environment_location = data.azurerm_container_app_environment.runner.location
    key_vault = {
      name                = local.runner.secret.kv_name
      resource_group_name = local.runner.secret.kv_resource_group_name
    }
  }
}

output "pep_vnet_id" {
  value = data.azurerm_virtual_network.common.id
}

output "dns_zone_resource_group_id" {
  value = data.azurerm_resource_group.external.id
}

output "opex_resource_group_id" {
  value = data.azurerm_resource_group.dashboards.id
}

output "tags" {
  value = local.tags
}
