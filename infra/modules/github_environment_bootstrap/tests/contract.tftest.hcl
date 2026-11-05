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
    teams = concat(
      [
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
      ],
      [
        for id in range(1, 8) : {
          description      = "Test team ${id}"
          id               = id
          members          = []
          name             = "Test Team ${id}"
          node_id          = "T_test_${id}"
          parent           = {}
          parent_team_id   = ""
          parent_team_slug = ""
          privacy          = "closed"
          repositories     = []
          slug             = "team-${id}"
        }
      ]
    )
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

run "github_environment_bootstrap_allows_six_distinct_reviewer_teams" {
  command = plan

  variables {
    repository = {
      name            = "dx-test-monorepo-starter-pack"
      description     = "Devex repository for shared tools and pipelines."
      topics          = ["developer-experience"]
      reviewers_teams = ["team-1", "team-2", "team-3", "team-4", "team-5", "team-6"]
    }
  }

  assert {
    condition     = length(github_repository_environment.infra_cd["prod"].reviewers[0].teams) == 6
    error_message = "All six distinct reviewer teams must be configured on the environment"
  }
}

run "github_environment_bootstrap_duplicate_reviewer_teams_count_once" {
  command = plan

  variables {
    repository = {
      name            = "dx-test-monorepo-starter-pack"
      description     = "Devex repository for shared tools and pipelines."
      topics          = ["developer-experience"]
      reviewers_teams = ["team-1", "team-2", "team-3", "team-4", "team-5", "team-6", "team-1"]
    }
  }

  assert {
    condition     = length(github_repository_environment.infra_cd["prod"].reviewers[0].teams) == 6
    error_message = "Duplicate reviewer team slugs must not consume additional reviewer slots"
  }
}

run "github_environment_bootstrap_rejects_more_than_six_distinct_reviewer_teams" {
  command = plan

  variables {
    repository = {
      name            = "dx-test-monorepo-starter-pack"
      description     = "Devex repository for shared tools and pipelines."
      topics          = ["developer-experience"]
      reviewers_teams = ["team-1", "team-2", "team-3", "team-4", "team-5", "team-6", "team-7"]
    }
  }

  expect_failures = [var.repository]
}
