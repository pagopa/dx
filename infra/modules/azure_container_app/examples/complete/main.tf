resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-example-rg-${local.environment.instance_number}"
  location = local.environment.location

  tags = local.tags
}


resource "azurerm_container_app_environment" "example" {
  name                = "${local.project}-test-cae-${local.environment.instance_number}"
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.example.name

  tags = local.tags
}


module "container_app" {
  source = "../../"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  container_app_environment_id = azurerm_container_app_environment.example.id

  tier = "m"

  container_app_template = {
    image = "nginx:latest"
    name  = "nginx"

    app_settings = {
      key1 = "value1"
      key2 = "value2"
    }
  }

  tags = local.tags
}
