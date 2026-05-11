moved {
  from = module.dx_app_cd_resource_group_deploy
  to   = module.custom_roles.module.dx_app_cd_resource_group_deploy
}

moved {
  from = module.dx_app_ci_resource_group_reader
  to   = module.custom_roles.module.dx_app_ci_resource_group_reader
}

moved {
  from = module.dx_infra_cd_private_networking
  to   = module.custom_roles.module.dx_infra_cd_private_networking
}

moved {
  from = module.dx_infra_cd_resource_group_deploy
  to   = module.custom_roles.module.dx_infra_cd_resource_group_deploy
}

moved {
  from = module.dx_infra_cd_subscription_admin
  to   = module.custom_roles.module.dx_infra_cd_subscription_admin
}

moved {
  from = module.dx_infra_ci_resource_group_reader
  to   = module.custom_roles.module.dx_infra_ci_resource_group_reader
}

moved {
  from = module.dx_infra_ci_subscription_reader
  to   = module.custom_roles.module.dx_infra_ci_subscription_reader
}

moved {
  from = module.dx_function_host_storage
  to   = module.custom_roles.module.dx_function_host_storage
}

moved {
  from = module.dx_function_durable_storage
  to   = module.custom_roles.module.dx_function_durable_storage
}
