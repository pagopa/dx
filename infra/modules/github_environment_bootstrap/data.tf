data "github_organization_teams" "all" {
  root_teams_only = true
  summary_only    = true
}

data "github_repository" "current" {
  name = github_repository.this.name

  depends_on = [github_repository.this]
}
