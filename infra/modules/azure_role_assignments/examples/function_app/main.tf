resource "azurerm_resource_group" "example" {
  name     = "${local.resource_prefix}-rg-${local.environment.instance_number}"
  location = "Italy North"
}

module "function" {
  source      = "../../../azure_function_app"
  environment = local.environment

  resource_group_name = azurerm_resource_group.example.name
  health_check_path   = "/api/v1/info"
  node_version        = 18

  subnet_cidr                          = "10.50.246.0/24"
  subnet_pep_id                        = data.azurerm_subnet.private_endpoints_subnet.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  virtual_network = {
    name                = data.azurerm_virtual_network.itn_common.name
    resource_group_name = data.azurerm_virtual_network.itn_common.resource_group_name
  }

  app_settings      = {}
  slot_app_settings = {}

  tier = "test"

  tags = local.tags
}

module "roles" {
  source          = "../../"
  principal_id    = module.function.function_app.function_app.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id
  cosmos = [
    {
      account_name        = "<THE_COSMOS_ACCOUNT_NAME>"
      resource_group_name = "<THE_COSMOS_RESOURCE_GROUP_NAME>"
      description         = "Why this role is assigned"
      role                = "writer"
      database            = "a"
      collections         = ["x", "y"]
    },
    {
      account_name        = "<THE_COSMOS_ACCOUNT_NAME>"
      resource_group_name = "<THE_COSMOS_RESOURCE_GROUP_NAME>"
      description         = "Why this role is assigned"
      role                = "reader"
      database            = "b"
    }
  ]

  redis = [
    {
      cache_name          = "<THE_REDIS_CACHE_NAME>"
      resource_group_name = "<THE_REDIS_RESOURCE_GROUP_NAME>"
      description         = "Why this role is assigned"
      role                = "reader"
      username            = "pippo"
    }
  ]

  key_vault = [
    {
      name                = "<THE_KEY_VAULT_NAME>"
      resource_group_name = "<THE_KEY_VAULT_RESOURCE_GROUP_NAME>"
      description         = "Why this role is assigned"
      roles = {
        secrets = "reader"
      }
    }
  ]
}
