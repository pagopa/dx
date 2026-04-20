variable "repository" {
  type = object({
    name                            = string
    description                     = string
    topics                          = list(string)
    default_branch_name             = optional(string, "main")
    reviewers_teams                 = list(string)
    infra_cd_policy_branches        = optional(set(string), ["main"])
    opex_cd_policy_branches         = optional(set(string), ["main"])
    app_cd_policy_branches          = optional(set(string), ["main"])
    bootstrapper_cd_policy_branches = optional(set(string), ["main"])
    infra_cd_policy_tags            = optional(set(string), [])
    opex_cd_policy_tags             = optional(set(string), [])
    app_cd_policy_tags              = optional(set(string), [])
    bootstrapper_cd_policy_tags     = optional(set(string), [])
    jira_boards_ids                 = optional(list(string), [])
    pages_enabled                   = optional(bool, false)
    # The `has_downloads` property will be removed in the next major release. See https://github.com/orgs/community/discussions/102145#discussioncomment-8351756
    has_downloads          = optional(bool, false)
    has_issues             = optional(bool, false)
    has_projects           = optional(bool, false)
    homepage_url           = optional(string, null)
    pull_request_bypassers = optional(list(string), [])
    environments           = optional(list(string), ["prod"])
  })

  description = <<-EOT
    GitHub Repository configuration with:
    - `name`, `description`, `topics`: repository metadata.
    - `default_branch_name`: the main integration branch (default: "main").
    - `reviewers_teams`: teams required to review and approve PRs.
    - `pull_request_bypassers`: users/teams allowed to merge without approval.
    - `infra/opex/app/bootstrapper_cd_policy_branches`: branches that trigger CD deployments.
    - `infra/opex/app/bootstrapper_cd_policy_tags`: tags that trigger CD deployments.
    - `jira_boards_ids`: linked Jira board identifiers.
    - `pages_enabled`, `has_issues`, `has_projects`, `has_downloads`, `homepage_url`: GitHub repository feature toggles.
    - `environments`: list of deployment environments (e.g., dev, prod).
  EOT
}
