data "azurerm_resource_group" "tests" {
  for_each = var.test_modes

  name = provider::dx::resource_name(
    merge(
      var.environment,
      {
        resource_type = "resource_group",
        name          = each.value
      }
  ))
}
