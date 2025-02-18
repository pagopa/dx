# output "federated_ci_identity" {
#   value = try(
#     {
#       id                  = module.federated_ci_identity[0].identity_principal_id
#       client_id           = module.federated_ci_identity[0].identity_client_id
#       name                = module.federated_ci_identity[0].identity_app_name
#       resource_group_name = module.federated_ci_identity[0].identity_resource_group
#     }, {}
#   )

#   description = "Data about the Continuos Integration managed identity created"
# }

# output "federated_cd_identity" {
#   value = try(
#     {
#       id                  = module.federated_cd_identity[0].identity_principal_id
#       client_id           = module.federated_cd_identity[0].identity_client_id
#       name                = module.federated_cd_identity[0].identity_app_name
#       resource_group_name = module.federated_cd_identity[0].identity_resource_group
#     }, {}
#   )

#   description = "Data about the Continuos Delivery managed identity created"
# }
