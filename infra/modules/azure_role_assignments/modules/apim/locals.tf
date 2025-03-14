locals {
  norm_apims = [for apim in var.apim : {
    name                = provider::azurerm::parse_resource_id(apim.id)["resource_name"]
    id                  = apim.id
    resource_group_name = provider::azurerm::parse_resource_id(apim.id)["resource_group_name"]
    role                = apim.role
    description         = apim.description
  }]
  role_definition_name = {
    reader = "API Management Service Reader Role"
    writer = "API Management Service Operator Role"
    owner  = "API Management Service Contributor"
  }
}

