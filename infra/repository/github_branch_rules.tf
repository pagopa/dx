resource "github_branch_default" "default_main" {
  repository = github_repository.this.name
  branch     = "main"
}

resource "github_branch_protection" "protection_main" {
  repository_id = data.github_repository.this.node_id
  force_push_bypassers            = []
  pattern       = "main"

  # required_status_checks {
  #   strict   = false
  #   contexts = []
  # }

  require_conversation_resolution = true
  require_signed_commits          = false

  required_pull_request_reviews {
    dismiss_stale_reviews           = false
    require_code_owner_reviews      = true
    required_approving_review_count = 1
    #
    dismissal_restrictions = []
    pull_request_bypassers = []
    restrict_dismissals    = false
  }

  allows_deletions = false
}
