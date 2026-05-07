locals {
  default_cd_policy_branches = toset([var.repository.default_branch_name])

  infra_cd_policy_branches = (
    var.repository.infra_cd_policy_branches != null
    ? var.repository.infra_cd_policy_branches
    : local.default_cd_policy_branches
  )

  opex_cd_policy_branches = (
    var.repository.opex_cd_policy_branches != null
    ? var.repository.opex_cd_policy_branches
    : local.default_cd_policy_branches
  )

  app_cd_policy_branches = (
    var.repository.app_cd_policy_branches != null
    ? var.repository.app_cd_policy_branches
    : local.default_cd_policy_branches
  )

  bootstrapper_cd_policy_branches = (
    var.repository.bootstrapper_cd_policy_branches != null
    ? var.repository.bootstrapper_cd_policy_branches
    : local.default_cd_policy_branches
  )
}
