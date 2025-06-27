locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    name            = trimsuffix(substr(var.repository.name, 0, 16), "-"),
    instance_number = tonumber(var.environment.instance_number),
  }
  env = {
    "d" = "dev",
    "u" = "uat",
    "p" = "prod"
  }
  container_apps = {
    job_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "container_app_job" }))
    resource_group_name = var.resource_group_name == null ? provider::dx::resource_name(merge(local.naming_config, {
      name          = "github-runner",
      resource_type = "resource_group"
    })) : var.resource_group_name
  }

  labels = join(",", coalescelist(var.container_app_environment.override_labels, [local.env[var.environment.env_short]]))

  key_vault_id  = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.key_vault.resource_group_name}/providers/Microsoft.KeyVault/vaults/${var.key_vault.name}"
  key_vault_uri = "https://${var.key_vault.name}.vault.azure.net/"
}
