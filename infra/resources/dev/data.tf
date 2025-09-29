data "azurerm_key_vault" "common" {
  name = provider::dx::resource_name(
    merge(
      local.environment,
      {
        resource_type = "key_vault",
        name          = "common",
      }
  ))
  resource_group_name = provider::dx::resource_name(
    merge(
      local.environment,
      {
        resource_type = "resource_group",
        name          = "common",
      }
  ))
}
