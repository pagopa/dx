locals {
  resource_group = {
    name     = "${module.naming_convention.prefix}-rg-${module.naming_convention.suffix}"
    location = var.environment.location
  }

  resource_group_ids = merge(
    {
      "main" = azurerm_resource_group.main.id
    },
    {
      for rg in var.additional_resource_group_ids : rg => rg
    }
  )

  container_apps = {
    job_name    = "${module.naming_convention.prefix}-caj-${module.naming_convention.suffix}"
    secret_name = "personal-access-token"
  }

  has_apim = var.apim_id != null ? 1 : 0

  # %s is replaced by `ci` or `cd`
  ids = {
    #e.g. io-p-itn-ipatente-app-github-cd-id-01
    infra_name = "${module.naming_convention.prefix}-infra-github-%s-id-${module.naming_convention.suffix}"
    app_name   = "${module.naming_convention.prefix}-app-github-%s-id-${module.naming_convention.suffix}"
    opex_name  = "${module.naming_convention.prefix}-opex-github-%s-id-${module.naming_convention.suffix}"

    # e.g. infra-prod-cd
    infra_environment_name = "infra-${module.naming_convention.env_name}-%s"
    app_environment_name   = "app-${module.naming_convention.env_name}-%s"
    opex_environment_name  = "opex-${module.naming_convention.env_name}-%s"

    issuer   = "https://token.actions.githubusercontent.com"
    audience = ["api://AzureADTokenExchange"]

    federated_identity_name = "${var.repository.name}-environment-%s-${module.naming_convention.env_name}-%s"

    location = var.environment.location
  }

  tf_storage_account = {
    id = provider::azurerm::normalise_resource_id("${var.subscription_id}/resourceGroups/${var.terraform_storage_account.resource_group_name}/providers/Microsoft.Storage/storageAccounts/${var.terraform_storage_account.name}")
  }

  parsed_subscription_id = provider::azurerm::parse_resource_id(var.subscription_id)

  repo_secrets = {
    "ARM_TENANT_ID"       = var.tenant_id
    "ARM_SUBSCRIPTION_ID" = local.parsed_subscription_id.subscription_id
  }

  infra_ci = {
    secrets = {
      "ARM_CLIENT_ID" = azurerm_user_assigned_identity.infra_ci.client_id
    }
  }

  opex_ci = {
    secrets = {
      "ARM_CLIENT_ID" = azurerm_user_assigned_identity.opex_ci.client_id
    }
  }

  infra_cd = {
    secrets = {
      "ARM_CLIENT_ID" = azurerm_user_assigned_identity.infra_cd.client_id
    }
    reviewers_teams = var.repository.reviewers_teams
  }

  app_cd = {
    secrets = {
      "ARM_CLIENT_ID" = azurerm_user_assigned_identity.app_cd.client_id
    }
    reviewers_teams = var.repository.reviewers_teams
  }

  opex_cd = {
    secrets = {
      "ARM_CLIENT_ID" = azurerm_user_assigned_identity.opex_cd.client_id
    }
    reviewers_teams = var.repository.reviewers_teams
  }
}
