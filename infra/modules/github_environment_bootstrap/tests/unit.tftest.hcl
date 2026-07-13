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

run "github_environment_bootstrap_repository_defaults" {
  command = plan

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
    error_message = "The repository visibility is not correct"
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
}

run "github_environment_bootstrap_branch_protection_defaults" {
  command = plan

  assert {
    condition     = github_branch_protection.main.pattern == "main"
    error_message = "The repository branch protection on main is not set"
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

