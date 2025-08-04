locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
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

  resource_group = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      name          = var.environment.domain
      resource_type = "resource_group"
    }))
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

  has_apim                    = var.apim_id != null ? 1 : 0
  has_sbns                    = var.sbns_id != null ? 1 : 0
  has_log_analytics_workspace = var.log_analytics_workspace_id != null ? 1 : 0

  # %s is replaced by `ci` or `cd`
  ids = {
    #e.g. io-p-itn-ipatente-app-github-cd-id-01
    infra_name = provider::dx::resource_name(merge(local.naming_config, {
      domain        = var.environment.domain
      name          = "infra-github-%s"
      resource_type = "managed_identity"
    }))
    app_name = provider::dx::resource_name(merge(local.naming_config, {
      domain        = var.environment.domain
      name          = "app-github-%s"
      resource_type = "managed_identity"
    }))
    opex_name = provider::dx::resource_name(merge(local.naming_config, {
      domain        = var.environment.domain
      name          = "opex-github-%s"
      resource_type = "managed_identity"
    }))

    # e.g. infra-${local.env_name}-cd
    infra_environment_name = "infra-${local.env_name}-%s"
    app_environment_name   = "app-${local.env_name}-%s"
    opex_environment_name  = "opex-${local.env_name}-%s"

    issuer   = "https://token.actions.githubusercontent.com"
    audience = ["api://AzureADTokenExchange"]

    federated_identity_name = "${var.repository.name}-environment-%s-${local.env_name}-%s"

    location = var.environment.location
  }

  tf_storage_account = {
    id = provider::azurerm::normalise_resource_id("${var.subscription_id}/resourceGroups/${var.terraform_storage_account.resource_group_name}/providers/Microsoft.Storage/storageAccounts/${var.terraform_storage_account.name}")
  }

  parsed_subscription_id = provider::azurerm::parse_resource_id(var.subscription_id)

  repo_secrets = {
    "ARM_TENANT_ID" = var.tenant_id
  }

  infra_ci = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.infra_ci.client_id
      "ARM_SUBSCRIPTION_ID" = local.parsed_subscription_id.subscription_id
    }
  }

  opex_ci = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.opex_ci.client_id
      "ARM_SUBSCRIPTION_ID" = local.parsed_subscription_id.subscription_id
    }
  }

  infra_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.infra_cd.client_id
      "ARM_SUBSCRIPTION_ID" = local.parsed_subscription_id.subscription_id
    }
  }

  app_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.app_cd.client_id
      "ARM_SUBSCRIPTION_ID" = local.parsed_subscription_id.subscription_id
    }
  }

  opex_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.opex_cd.client_id
      "ARM_SUBSCRIPTION_ID" = local.parsed_subscription_id.subscription_id
    }
  }
}
