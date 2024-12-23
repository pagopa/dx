resource "github_branch_default" "main" {
  repository = github_repository.this.name
  branch     = "main"
}

resource "github_branch_protection" "main" {
  repository_id = github_repository.this.name
  pattern       = "main"

  required_status_checks {
    strict   = false
    contexts = []
  }

  require_conversation_resolution = true
  enforce_admins                  = true
  require_signed_commits          = false
  allows_force_pushes             = false
  allows_deletions                = false

  required_pull_request_reviews {
    dismiss_stale_reviews           = false
    require_code_owner_reviews      = true
    required_approving_review_count = 1
    restrict_dismissals             = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
