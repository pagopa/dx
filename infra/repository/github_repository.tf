resource "github_repository" "this" {
  name        = "dx"
  description = "Devex repository for shared tools and pipelines."

  visibility = "public"

  allow_auto_merge            = false
  allow_rebase_merge          = false
  allow_merge_commit          = false
  allow_squash_merge          = true
  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "BLANK"

  delete_branch_on_merge = false

  has_projects    = false

  has_issues      = false
  has_downloads   = false

  vulnerability_alerts = true

  pages {
    build_type = "workflow"
    custom_404 = false
    html_url   = "https://pagopa.github.io/dx/"
    url        = "https://api.github.com/repos/pagopa/dx/pages"

    source {
        branch = "main"
        path   = "/"
      }
    }

}
