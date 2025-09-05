data "github_organization_teams" "all" {
  root_teams_only = true
  summary_only    = true
}
