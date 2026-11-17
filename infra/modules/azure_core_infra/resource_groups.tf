resource "azurerm_resource_group" "common" {
  name = provider::dx::resource_name(merge(
    local.naming_config,
    {
      name          = "common",
      domain        = "",
      resource_type = "resource_group",
  }))
  location = var.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "network" {
  name = provider::dx::resource_name(merge(
    local.naming_config,
    {
      name          = "network",
      domain        = "",
      resource_type = "resource_group",
    })
  )
  location = var.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "gh_runner" {
  name = provider::dx::resource_name(merge(
    local.naming_config,
    {
      name          = "github-runner",
      domain        = "",
      resource_type = "resource_group",
    })
  )
  location = var.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "test" {
  count = var.test_enabled ? 1 : 0

  name = provider::dx::resource_name(merge(
    local.naming_config,
    {
      name          = "test",
      domain        = "",
      resource_type = "resource_group",
    })
  )
  location = var.environment.location

  tags = local.tags
}

resource "azurerm_resource_group" "opex" {
  name = provider::dx::resource_name(merge(
    local.naming_config,
    {
      name          = "opex",
      domain        = "",
      resource_type = "resource_group",
    })
  )
  location = var.environment.location

  tags = local.tags
}
