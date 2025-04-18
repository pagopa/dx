resource "github_repository" "this" {
  name        = "dx"
  description = "Devex repository for shared tools and pipelines."

  visibility = "public"

  allow_auto_merge            = true
  allow_rebase_merge          = false
  allow_merge_commit          = false
  allow_squash_merge          = true
  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "PR_BODY"

  delete_branch_on_merge = true

  has_projects = true

  has_issues    = false
  has_downloads = true

  vulnerability_alerts = true

  homepage_url = "https://pagopa.github.io/dx/docs/"

  pages {
    build_type = "workflow"
    source {
      branch = "main"
      path   = "/"
    }
  }
}

resource "github_repository_autolink_reference" "jira" {
  for_each = toset(local.jira_boards_ids)

  key_prefix          = format("%s-", each.value)
  repository          = github_repository.this.name
  target_url_template = "https://pagopa.atlassian.net/browse/${each.value}-<num>"
}
