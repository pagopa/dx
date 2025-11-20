locals {
  norm_app_configs = [for app_config in var.app_config : {
    name                = app_config.name
    id                  = "/subscriptions/${var.subscription_id}/resourceGroups/${app_config.resource_group_name}/providers/Microsoft.AppConfiguration/configurationStores/${app_config.name}"
    resource_group_name = app_config.resource_group_name
    role                = app_config.role
    description         = app_config.description
  }]

  app_config_assignments = merge([for key, item in local.norm_app_configs : { for role_name in local.role_definition_name[lower(item.role)] : "${item.resource_group_name}|${item.name}|${item.role}|${role_name}" => merge(item, { role_definition_name = role_name }) }]...)

  role_definition_name = {
    reader = ["App Configuration Data Reader"]
    writer = ["App Configuration Data Owner"]
    owner  = ["App Configuration Contributor", "App Configuration Data Owner"]
  }
}
