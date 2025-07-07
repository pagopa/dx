resource "github_repository" "this" {
  name        = var.repository.name
  description = var.repository.description
  topics      = var.repository.topics

  visibility = "public"

  homepage_url = var.repository.homepage_url

  allow_auto_merge            = true
  allow_rebase_merge          = false
  allow_merge_commit          = false
  allow_squash_merge          = true
  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "PR_BODY"

  delete_branch_on_merge = true

  has_projects    = var.repository.has_projects
  has_wiki        = false
  has_discussions = false
  has_issues      = true
  has_downloads   = var.repository.has_downloads

  vulnerability_alerts = true

  archive_on_destroy  = true
  allow_update_branch = true

  security_and_analysis {
    secret_scanning {
      status = "enabled"
    }

    secret_scanning_push_protection {
      status = "enabled"
    }

    advanced_security {
      status = "enabled"
    }
  }

  dynamic "pages" {
    for_each = var.repository.pages_enabled ? [var.repository.pages_enabled] : []
    content {
      build_type = "workflow"
    }
  }
}

resource "github_repository_autolink_reference" "jira_board" {
  for_each = toset(var.repository.jira_boards_ids)

  repository          = github_repository.this.name
  key_prefix          = format("%s-", each.value)
  target_url_template = "https://pagopa.atlassian.net/browse/${each.value}-<num>"
}
