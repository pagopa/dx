module "github_repository" {
  for_each = var.repository.configure ? [var.repository.name] : []
  source  = "pagopa-dx/github-environment-bootstrap/github"
  version = "~> 0.0"

  repository = {
    name                = var.repository.name
    description         = var.repository.description
    topics              = var.repository.topics
    default_branch_name = var.repository.default_branch_name
    jira_boards_ids     = var.repository.jira_boards_ids
  }
}
