locals {
  apims = distinct([for assignment in var.apim : { name = assignment.name, resource_group_name = assignment.resource_group_name } if assignment.id == null])

  norm_apims = [for apim in var.apim : {
    name                = try(provider::azurerm::parse_resource_id(apim.id)["resource_name"], apim.name)
    id                  = try(data.azurerm_api_management.this["${apim.resource_group_name}|${apim.name}"].id, apim.id)
    resource_group_name = try(provider::azurerm::parse_resource_id(apim.id)["resource_group_name"], apim.resource_group_name)
    role                = apim.role
  }]
  role_definition_name = {
    reader = "API Management Service Reader Role"
    writer = "API Management Service Operator Role"
    owner  = "API Management Service Contributor"
  }
}

