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

  subnet_cidr                          = "10.20.6.0/24"
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
  source       = "../../"
  principal_id = module.function.function_app.function_app.principal_id

  cosmos = [
    {
      account_name        = "io-p-cosmos-example-cms"
      resource_group_name = "io-p-example-cms-rg"
      role                = "writer"
      databases           = "a"
      collections         = ["x", "y"]
    },
    {
      account_name        = "io-p-cosmos-example-cms"
      resource_group_name = "io-p-example-cms-rg"
      role                = "reader"
    }
  ]

  redis = [
    {
      cache_name          = "io-p-itn-example-redis-01"
      resource_group_name = "io-p-itn-example-rg-01"
      role                = "reader"
      username            = "pippo"
    }
  ]

  key_vault = [
    {
      name                = "io-p-example-kv"
      resource_group_name = "io-p-example-rg"
      roles = {
        secrets = "reader"
      }
    }
  ]
}