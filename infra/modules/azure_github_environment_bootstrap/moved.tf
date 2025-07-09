moved {
  from = github_repository_environment.infra_prod_cd
  to   = github_repository_environment.infra_cd
}

moved {
  from = github_repository_environment.app_prod_cd
  to   = github_repository_environment.app_cd
}

moved {
  from = github_repository_environment.opex_prod_cd
  to   = github_repository_environment.opex_cd
}

moved {
  from = github_repository_environment_deployment_policy.infra_prod_cd_branch
  to   = github_repository_environment_deployment_policy.infra_cd_branch
}

moved {
  from = github_repository_environment_deployment_policy.opex_prod_cd_branch
  to   = github_repository_environment_deployment_policy.opex_cd_branch
}

moved {
  from = github_repository_environment_deployment_policy.infra_prod_cd_tag
  to   = github_repository_environment_deployment_policy.infra_cd_tag
}

moved {
  from = github_repository_environment_deployment_policy.app_prod_cd_tag
  to   = github_repository_environment_deployment_policy.app_cd_tag
}

moved {
  from = github_repository_environment_deployment_policy.opex_prod_cd_tag
  to   = github_repository_environment_deployment_policy.opex_cd_tag
}

moved {
  from = github_repository_environment_deployment_policy.app_prod_cd_branch
  to   = github_repository_environment_deployment_policy.app_cd_branch
}

moved {
  from = github_actions_environment_secret.infra_prod_cd
  to   = github_actions_environment_secret.infra_cd
}

moved {
  from = github_actions_environment_secret.app_prod_cd
  to   = github_actions_environment_secret.app_cd
}

moved {
  from = github_actions_environment_secret.opex_prod_cd
  to   = github_actions_environment_secret.opex_cd
}

moved {
  from = github_repository_environment.infra_prod_ci
  to   = github_repository_environment.infra_ci
}

moved {
  from = github_repository_environment.opex_prod_ci
  to   = github_repository_environment.opex_ci
}

moved {
  from = github_actions_environment_secret.infra_prod_ci
  to   = github_actions_environment_secret.infra_ci
}

moved {
  from = github_actions_environment_secret.opex_prod_ci
  to   = github_actions_environment_secret.opex_ci
}