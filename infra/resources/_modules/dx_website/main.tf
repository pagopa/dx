resource "azurerm_static_web_app" "this" {
  name = provider::azuredx::resource_name(merge(
    var.naming_config,
    {
      name          = "website",
      resource_type = "static_web_app",
    })
  )
  resource_group_name = var.resource_group_name
  location            = "westeurope"
  sku_tier            = "Standard"
  sku_size            = "Standard"

  tags = var.tags
}
