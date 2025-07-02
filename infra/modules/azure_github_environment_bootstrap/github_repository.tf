module "github_repository" {
  for_each = var.repository.configure ? { repo = var.repository.name } : {}
  source   = "../github_environment_bootstrap"
  # version  = "~> 0.0"

  repository = {
    name                   = var.repository.name
    description            = var.repository.description
    topics                 = var.repository.topics
    default_branch_name    = var.repository.default_branch_name
    jira_boards_ids        = var.repository.jira_boards_ids
    pages_enabled          = var.repository.pages_enabled
    has_downloads          = var.repository.has_downloads
    has_projects           = var.repository.has_projects
    homepage_url           = var.repository.homepage_url
    pull_request_bypassers = var.repository.pull_request_bypassers
  }
}
