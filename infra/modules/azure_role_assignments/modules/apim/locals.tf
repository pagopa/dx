locals {
  apims = distinct([for assignment in var.apim : { name = assignment.name, resource_group_name = assignment.resource_group_name }])

  role_definition_name = {
    reader = "API Management Service Reader"
    writer = "API Management Service Editor"
    owner  = "API Management Service Contributor"
  }
}
