resource "null_resource" "workflow_permissions" {
  triggers = {
    repo = github_repository.this.full_name
  }

  provisioner "local-exec" {
    when    = create
    command = <<EOT
      gh api --method=PUT "repos/${self.triggers.repo}/actions/permissions/workflow" \
        -F can_approve_pull_request_reviews=true \
        -F default_workflow_permissions="write"
    EOT
  }
}

resource "github_actions_repository_permissions" "repo" {
  allowed_actions = "all"
  repository      = github_repository.this.name
}
