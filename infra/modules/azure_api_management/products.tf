resource "azurerm_api_management_product" "apim_product" {
  for_each = local.products_config

  product_id            = each.value.id
  resource_group_name   = var.resource_group_name
  api_management_name   = azurerm_api_management.this.name
  display_name          = each.value.display_name
  description           = each.value.description
  subscription_required = true
  approval_required     = false
  published             = true
}

resource "azurerm_api_management_product_policy" "this" {
  for_each = local.products_xml

  product_id          = each.key
  api_management_name = azurerm_api_management.this.name

  xml_content = each.value

  resource_group_name = var.resource_group_name

  depends_on = [azurerm_api_management_product.apim_product]
}

resource "azurerm_api_management_product_group" "this" {
  count = length(local.products_groups)

  product_id          = local.products_groups[count.index].product_id
  api_management_name = azurerm_api_management.this.name
  group_name          = local.products_groups[count.index].group_name

  resource_group_name = var.resource_group_name

  depends_on = [azurerm_api_management_product.apim_product]
}