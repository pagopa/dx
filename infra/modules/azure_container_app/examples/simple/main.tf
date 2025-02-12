resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-example-rg-${local.environment.instance_number}"
  location = local.environment.location
}

module "container_app" {
  source = "../../"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  create_container_app_environment = true

  container_app_template = {
    image = "nginx"
    name  = "nginx"
  }

  tags = local.tags
}
