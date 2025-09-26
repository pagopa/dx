resource "azurerm_resource_group" "tests" {
  for_each = var.tests_kind

  name = provider::dx::resource_name(
    merge(
      var.environment,
      {
        resource_type = "resource_group",
        name          = each.value
      }
  ))
  location = var.environment.location

  tags = var.tags
}
