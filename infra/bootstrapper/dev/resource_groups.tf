resource "azurerm_resource_group" "integration" {
  name = provider::dx::resource_name({
    prefix          = "dx"
    location        = "italynorth"
    environment     = "d"
    name            = "integration"
    instance_number = "01"
    resource_type   = "resource_group",
  })
  location = local.azure_environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "e2e" {
  name = provider::dx::resource_name({
    prefix          = "dx"
    location        = "italynorth"
    environment     = "d"
    name            = "e2e"
    instance_number = "01"
    resource_type   = "resource_group",
  })
  location = local.azure_environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "ai" {
  name = provider::dx::resource_name(merge(local.azure_environment,
    {
      domain        = ""
      app_name      = "ai"
      resource_type = "resource_group",
  }))
  location = local.azure_environment.location

  tags = local.tags
}
