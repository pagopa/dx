locals {
  resource_group = {
    name     = "${module.naming_convention.prefix}-rg-${module.naming_convention.suffix}"
    location = var.environment.location
  }

  container_apps = {
    job_name    = "${module.naming_convention.prefix}-${var.repository.name}-caj-${module.naming_convention.suffix}"
    secret_name = "personal-access-token"
    envs = [
      {
        name  = "REPO_URL"
        value = "https://github.com/${var.repository.owner}/${var.repository.name}"
      },
      {
        name  = "REGISTRATION_TOKEN_API_URL"
        value = "https://api.github.com/repos/${var.repository.owner}/${var.repository.name}/actions/runners/registration-token"
      },
      length(var.github_private_runner.labels) > 0 ?
      {
        name  = "LABELS"
        value = join(",", var.github_private_runner.labels)
      } : {}
    ]
  }

  ids = {
    infra_name = "${module.naming_convention.prefix}-infra-github-%s-id-${module.naming_convention.suffix}"
    app_name   = "${module.naming_convention.prefix}-app-github-%s-id-${module.naming_convention.suffix}"
    opex_name  = "${module.naming_convention.prefix}-opex-github-%s-id-${module.naming_convention.suffix}"

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

  parsed_key_vault_secret_id = provider::azurerm::parse_resource_id(var.github_private_runner.key_vault_secret_id)

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
