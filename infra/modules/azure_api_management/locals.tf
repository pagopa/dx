locals {
  # General
  location_short   = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project          = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain           = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  apim_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  apim = {
    name           = "${local.apim_name_prefix}-apim-${var.environment.instance_number}"
    autoscale_name = var.tier == "premium" ? "${local.apim_name_prefix}-apim-autoscale-${var.environment.instance_number}" : null
    sku_name       = var.tier == "test" ? "Developer_1" : var.tier == "standard" ? "Standard_1" : "Premium_1"
  }

  # Products
  products_config = length(var.products) > 0 ? { for p in var.products : p.id => p } : {}
  products_groups = length(var.products) > 0 ? flatten([
    for product in var.products : [
      for group in(product.groups != null ? product.groups : []) : {
        group_name = group
        product_id = product.id
      }
    ]
  ]) : []
  products_xml = length(var.products) > 0 ? { for p in var.products : p.id => p.xml_policy if p.xml_policy != null } : {}

  # APIs
  apis_config = length(var.apis) > 0 ? {
    for a in var.apis :
    a.api_version != null ? "${local.apim_name_prefix}-${a.name}-${var.environment.instance_number}-${a.api_version}" : "${local.apim_name_prefix}-${a.name}-${var.environment.instance_number}" => a
  } : {}
  apis_xml = length(var.apis) > 0 ? { for k, v in local.apis_config : k => v.xml_content if v.xml_content != null } : {}
  apis_products = length(var.apis) > 0 ? flatten([
    for k, v in local.apis_config : [
      for p in var.products : {
        api_name   = k
        product_id = p.id
      }
    ]
  ]) : []
  apis_operation_policies = length(var.apis) > 0 ? flatten([
    for k, v in local.apis_config : [
      for a in v.api_operation_policies : {
        api_name     = k
        operation_id = v.api_version != null ? "${a.operation_id}${v.api_version}" : a.operation_id
        xml_content  = a.xml_content
      }
    ]
  ]) : []
}