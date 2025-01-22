locals {
  apims = distinct([for assignment in var.apim : { name = assignment.name, resource_group_name = assignment.resource_group_name }])

  role_definition_name = {
    reader = "API Management Service Reader Role"
    writer = "API Management Service Operator Role"
    owner  = "API Management Service Contributor"
  }
}
