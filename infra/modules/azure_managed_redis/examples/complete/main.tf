resource "azurerm_resource_group" "example" {
  name     = "dx-d-itn-example-amr-rg-01"
  location = local.environment.location
  tags     = local.tags
}

resource "random_integer" "instance" {
  min = 1
  max = 99
}

module "managed_redis" {
  source = "../.."

  environment = merge(local.environment, {
    instance_number = format("%02d", random_integer.instance.result)
  })

  resource_group_name = azurerm_resource_group.example.name
  tags                = local.tags

  use_case = "default"

  subnet_pep_id = local.subnet_pep_id
  virtual_network = {
    name                = local.virtual_network_name
    resource_group_name = local.virtual_network_rg_name
  }

  database = {
    modules = [
      { name = "RedisJSON" },
      { name = "RediSearch" }
    ]
  }

  log_analytics_workspace_id = local.log_analytics_workspace_id

  alerts = {
    action_group_id = local.action_group_id
  }
}
