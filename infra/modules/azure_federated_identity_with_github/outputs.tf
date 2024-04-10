output "federated_ci_identity" {
  value = {
    id                  = module.federated_ci_identity[0].identity_principal_id
    client_id           = module.federated_ci_identity[0].identity_client_id
    name                = module.federated_ci_identity[0].identity_app_name
    resource_group_name = module.federated_ci_identity[0].identity_resource_group
  }

  precondition {
    condition     = var.continuos_integration.enable == true
    error_message = "Continuos Integration is not enabled"
  }

  description = "Data about the Continuos Integration managed identity created"
}

output "federated_cd_identity" {
  value = {
    id                  = module.federated_cd_identity[0].identity_principal_id
    client_id           = module.federated_cd_identity[0].identity_client_id
    name                = module.federated_cd_identity[0].identity_app_name
    resource_group_name = module.federated_cd_identity[0].identity_resource_group
  }

  precondition {
    condition     = var.continuos_delivery.enable == true
    error_message = "Continuos Delivery is not enabled"
  }

  description = "Data about the Continuos Delivery managed identity created"
}
