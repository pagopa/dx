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
    infra_environment_name      = "infra-${local.env_name}-%s"
    automation_environment_name = "automation-${local.env_name}-%s"
    app_environment_name        = "app-${local.env_name}-%s"
    opex_environment_name       = "opex-${local.env_name}-%s"

    issuer   = "https://token.actions.githubusercontent.com"
    audience = ["api://AzureADTokenExchange"]

    federated_identity_name = "${var.repository.name}-environment-%s-${local.env_name}-%s"

    location = var.environment.location
  }

  tf_storage_account = {
    id = provider::azurerm::normalise_resource_id("${data.azurerm_subscription.current.id}/resourceGroups/${var.terraform_storage_account.resource_group_name}/providers/Microsoft.Storage/storageAccounts/${var.terraform_storage_account.name}")
  }

  subscription_role_name_prefix = trimspace(data.azurerm_subscription.current.display_name)
  custom_role_definition_names = {
    dx_app_cd_resource_groups      = "${local.subscription_role_name_prefix} DX App CD Resource Groups"
    dx_app_ci_resource_groups      = "${local.subscription_role_name_prefix} DX App CI Resource Groups"
    dx_infra_cd_private_networking = "${local.subscription_role_name_prefix} DX Infra CD Private Networking"
    dx_infra_cd_resource_groups    = "${local.subscription_role_name_prefix} DX Infra CD Resource Groups"
    dx_infra_cd_subscription       = "${local.subscription_role_name_prefix} DX Infra CD Subscription"
    dx_infra_ci_resource_groups    = "${local.subscription_role_name_prefix} DX Infra CI Resource Groups"
    dx_infra_ci_subscription       = "${local.subscription_role_name_prefix} DX Infra CI Subscription"
  }

  repo_secrets = {
    "ARM_TENANT_ID" = data.azurerm_subscription.current.tenant_id
  }

  infra_ci = {
    secrets = {
      "ARM_CLIENT_ID"         = azurerm_user_assigned_identity.infra_ci.client_id
      "ARM_SUBSCRIPTION_ID"   = data.azurerm_subscription.current.subscription_id
      "INFRA_CD_PRINCIPAL_ID" = azurerm_user_assigned_identity.infra_cd.principal_id
    }
  }

  app_ci = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.app_ci.client_id
      "ARM_SUBSCRIPTION_ID" = data.azurerm_subscription.current.subscription_id
    }
  }

  opex_ci = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.opex_ci.client_id
      "ARM_SUBSCRIPTION_ID" = data.azurerm_subscription.current.subscription_id
    }
  }

  infra_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.infra_cd.client_id
      "ARM_SUBSCRIPTION_ID" = data.azurerm_subscription.current.subscription_id
    }
  }

  automation_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.infra_cd.client_id
      "ARM_SUBSCRIPTION_ID" = data.azurerm_subscription.current.subscription_id
    }
  }

  app_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.app_cd.client_id
      "ARM_SUBSCRIPTION_ID" = data.azurerm_subscription.current.subscription_id
    }
  }

  opex_cd = {
    secrets = {
      "ARM_CLIENT_ID"       = azurerm_user_assigned_identity.opex_cd.client_id
      "ARM_SUBSCRIPTION_ID" = data.azurerm_subscription.current.subscription_id
    }
  }
}
