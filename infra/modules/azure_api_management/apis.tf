resource "azurerm_api_management_api" "this" {
  for_each             = local.apis_config
  name                 = each.key
  resource_group_name  = var.resource_group_name
  api_management_name  = azurerm_api_management.this.name
  revision             = each.value.revision
  revision_description = each.value.revision_description
  display_name         = each.value.display_name
  description          = each.value.description
  api_type             = each.value.api_type

  dynamic "oauth2_authorization" {
    for_each = each.value.oauth2_authorization_server_name != null ? ["dummy"] : []
    content {
      authorization_server_name = each.value.oauth2_authorization_server_name
    }
  }

  path                  = each.value.path
  protocols             = each.value.protocols
  service_url           = each.value.service_url
  subscription_required = each.value.subscription_required
  version               = each.value.api_version
  version_set_id        = each.value.version_set_id

  import {
    content_format = each.value.content_format
    content_value  = each.value.content_value
  }

  dynamic "subscription_key_parameter_names" {
    for_each = each.value.subscription_key_names == null ? [] : ["dummy"]
    content {
      header = each.value.subscription_key_names.header
      query  = each.value.subscription_key_names.query
    }
  }
}

resource "azurerm_api_management_api_policy" "this" {
  for_each            = local.apis_xml
  api_name            = each.key
  api_management_name = azurerm_api_management.this.name
  resource_group_name = var.resource_group_name

  xml_content = each.value

  depends_on = [azurerm_api_management_api.this]
}

resource "azurerm_api_management_product_api" "this" {
  for_each = {
    for p in local.apis_products : "${p.product_id}-${p.api_name}" => p
  }

  product_id          = each.value.product_id
  api_name            = each.value.api_name
  api_management_name = azurerm_api_management.this.name
  resource_group_name = var.resource_group_name

  depends_on = [
    azurerm_api_management_api.this,
    azurerm_api_management_product.apim_product
  ]
}

resource "azurerm_api_management_api_operation_policy" "api_operation_policy" {
  for_each = {
    for op in local.apis_operation_policies : "${op.api_name}-${op.operation_id}" => op
  }

  api_name            = each.value.api_name
  api_management_name = azurerm_api_management.this.name
  resource_group_name = var.resource_group_name
  operation_id        = each.value.operation_id

  xml_content = each.value.xml_content

  depends_on = [azurerm_api_management_api.this]
}