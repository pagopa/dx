variable "repository" {
  type = object({
    name                     = string
    description              = string
    topics                   = list(string)
    default_branch_name      = optional(string, "main")
    reviewers_teams          = list(string)
    infra_cd_policy_branches = optional(set(string), ["main"])
    opex_cd_policy_branches  = optional(set(string), ["main"])
    app_cd_policy_branches   = optional(set(string), ["main"])
    infra_cd_policy_tags     = optional(set(string), [])
    opex_cd_policy_tags      = optional(set(string), [])
    app_cd_policy_tags       = optional(set(string), [])
    jira_boards_ids          = optional(list(string), [])
    pages_enabled            = optional(bool, false)
    has_downloads            = optional(bool, false)
    has_projects             = optional(bool, false)
    homepage_url             = optional(string, null)
    pull_request_bypassers   = optional(list(string), [])
    environments             = optional(list(string), ["prod"])
  })

  description = "Details about the GitHub repository, including its name, description, topics, default branch, and optional Jira board IDs."
}
