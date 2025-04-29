locals {
  norm_apims = [for apim in var.apim : {
    name                = apim.name
    id                  = "/subscriptions/${var.subscription_id}/resourceGroups/${apim.resource_group_name}/providers/Microsoft.ApiManagement/service/${apim.name}"
    resource_group_name = apim.resource_group_name
    role                = apim.role
    description         = apim.description
  }]
  role_definition_name = {
    reader = "API Management Service Reader Role"
    writer = "API Management Service Operator Role"
    owner  = "API Management Service Contributor"
  }
}

