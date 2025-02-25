resource "github_repository" "this" {
  name        = "dx"
  description = "Devex repository for shared tools and pipelines."

  visibility = "public"

  allow_auto_merge            = false
  allow_rebase_merge          = false
  allow_merge_commit          = false
  allow_squash_merge          = true
  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "PR_BODY"

  delete_branch_on_merge = false

  has_projects = true

  has_issues    = true
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
