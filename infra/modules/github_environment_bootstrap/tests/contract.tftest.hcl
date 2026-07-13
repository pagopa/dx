variables {
  repository = {
    name            = "dx-test-monorepo-starter-pack"
    description     = "Devex repository for shared tools and pipelines."
    topics          = ["developer-experience"]
    reviewers_teams = ["engineering-team-devex"]
  }
}

mock_provider "github" {}

override_data {
  target = data.github_organization_teams.all
  values = {
    teams = [
      {
        description      = "Developer Experience team"
        id               = 123456
        members          = []
        name             = "Engineering Team DevEx"
        node_id          = "T_kwDODevEx"
        parent           = {}
        parent_team_id   = ""
        parent_team_slug = ""
        privacy          = "closed"
        repositories     = []
        slug             = "engineering-team-devex"
      }
    ]
  }
}

run "github_environment_bootstrap_default_branch_override" {
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
}

run "github_environment_bootstrap_optional_repository_features" {
  command = plan

  variables {
    repository = {
      name            = "dx-test-monorepo-starter-pack"
      description     = "Devex repository for shared tools and pipelines."
      topics          = ["developer-experience"]
      reviewers_teams = ["engineering-team-devex"]
      environments    = ["dev", "uat", "prod"]
      jira_boards_ids = ["DX"]
      pages_enabled   = true
      has_issues      = true
      has_projects    = true
    }
  }

  assert {
    condition     = length(github_repository_environment.infra_ci) == 3
    error_message = "One Infra CI environment must be created for each repository environment"
  }

  assert {
    condition     = github_repository_autolink_reference.jira_board["DX"].key_prefix == "DX-"
    error_message = "Jira board IDs must be mapped to autolink key prefixes"
  }

  assert {
    condition     = github_repository.this.has_issues == true
    error_message = "The has_issues repository option must be honored"
  }

  assert {
    condition     = github_repository.this.has_projects == true
    error_message = "The has_projects repository option must be honored"
  }
}

