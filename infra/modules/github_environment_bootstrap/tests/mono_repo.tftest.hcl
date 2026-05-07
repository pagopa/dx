provider "github" {
  owner = "pagopa"
}

run "validate_github_repository" {
  command = plan

  variables {
    repository = {
      name            = "dx-test-monorepo-starter-pack"
      description     = "Devex repository for shared tools and pipelines."
      topics          = ["developer-experience"]
      reviewers_teams = ["engineering-team-devex"]
    }
  }

  assert {
    condition     = github_repository.this.name == "dx-test-monorepo-starter-pack"
    error_message = "The repository name is not correct"
  }

  assert {
    condition     = github_repository.this.description == "Devex repository for shared tools and pipelines."
    error_message = "The repository description is not correct"
  }

  assert {
    condition     = tolist(github_repository.this.topics) == tolist(["developer-experience"])
    error_message = "The repository topics are not correct"
  }

  assert {
    condition     = github_repository.this.visibility == "public"
    error_message = "The repository visibilty is not correct"
  }

  assert {
    condition     = github_repository.this.allow_rebase_merge == false
    error_message = "The repository PR merge setup is not correct"
  }

  assert {
    condition     = github_repository.this.allow_merge_commit == false
    error_message = "The repository PR merge setup is not correct"
  }

  assert {
    condition     = github_repository.this.allow_squash_merge == true
    error_message = "The repository PR merge setup is not correct"
  }

  assert {
    condition     = github_branch_protection.main.pattern == "main"
    error_message = "The repository branch protection on main is not set"
  }

  assert {
    condition     = github_repository_environment_deployment_policy.infra_cd_branch["prod-main"].branch_pattern == "main"
    error_message = "The infra deployment policy must default to the main branch"
  }

  assert {
    condition     = github_repository_environment_deployment_policy.app_cd_branch["prod-main"].branch_pattern == "main"
    error_message = "The app deployment policy must default to the main branch"
  }

  assert {
    condition     = github_repository_environment_deployment_policy.opex_cd_branch["prod-main"].branch_pattern == "main"
    error_message = "The opex deployment policy must default to the main branch"
  }

  assert {
    condition     = github_repository_environment_deployment_policy.bootstrapper_cd_branch["prod-main"].branch_pattern == "main"
    error_message = "The bootstrapper deployment policy must default to the main branch"
  }

  assert {
    condition     = github_branch_protection.main.require_conversation_resolution == true
    error_message = "The main branch is not requiring conversation resolution"
  }

  assert {
    condition     = github_branch_protection.main.allows_force_pushes == false
    error_message = "The main branch is allowing force pushes"
  }
}

run "validate_github_default_branch_override" {
  command = plan

  variables {
    repository = {
      name                = "dx-test-monorepo-starter-pack"
      description         = "Devex repository for shared tools and pipelines."
      topics              = ["developer-experience"]
      default_branch_name = "master"
      reviewers_teams     = ["engineering-team-devex"]
    }
  }

  assert {
    condition     = github_branch_protection.main.pattern == "master"
    error_message = "The repository branch protection on master is not set"
  }

  assert {
    condition     = github_repository_environment_deployment_policy.infra_cd_branch["prod-master"].branch_pattern == "master"
    error_message = "The infra deployment policy must inherit the custom default branch"
  }

  assert {
    condition     = github_repository_environment_deployment_policy.app_cd_branch["prod-master"].branch_pattern == "master"
    error_message = "The app deployment policy must inherit the custom default branch"
  }

  assert {
    condition     = github_repository_environment_deployment_policy.opex_cd_branch["prod-master"].branch_pattern == "master"
    error_message = "The opex deployment policy must inherit the custom default branch"
  }

  assert {
    condition     = github_repository_environment_deployment_policy.bootstrapper_cd_branch["prod-master"].branch_pattern == "master"
    error_message = "The bootstrapper deployment policy must inherit the custom default branch"
  }
}

run "validate_explicit_cd_policy_branch_override" {
  command = plan

  variables {
    repository = {
      name                     = "dx-test-monorepo-starter-pack"
      description              = "Devex repository for shared tools and pipelines."
      topics                   = ["developer-experience"]
      default_branch_name      = "master"
      infra_cd_policy_branches = ["release"]
      reviewers_teams          = ["engineering-team-devex"]
    }
  }

  assert {
    condition     = github_repository_environment_deployment_policy.infra_cd_branch["prod-release"].branch_pattern == "release"
    error_message = "An explicit infra deployment policy branch must override the default branch fallback"
  }

  assert {
    condition     = github_repository_environment_deployment_policy.app_cd_branch["prod-master"].branch_pattern == "master"
    error_message = "Unset deployment policy branches must keep inheriting the custom default branch"
  }
}
