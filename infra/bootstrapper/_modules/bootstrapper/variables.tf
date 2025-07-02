variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "repository" {
  type = object({
    owner                    = optional(string, "pagopa")
    name                     = string
    description              = string
    topics                   = list(string)
    reviewers_teams          = list(string)
    default_branch_name      = optional(string, "main")
    infra_cd_policy_branches = optional(set(string), ["main"])
    opex_cd_policy_branches  = optional(set(string), ["main"])
    app_cd_policy_branches   = optional(set(string), ["main"])
    infra_cd_policy_tags     = optional(set(string), [])
    opex_cd_policy_tags      = optional(set(string), [])
    app_cd_policy_tags       = optional(set(string), [])
    jira_boards_ids          = optional(list(string), [])
    configure                = optional(bool, true)
    pages_enabled            = optional(bool, false)
    has_downloads            = optional(bool, false)
    has_projects             = optional(bool, false)
    homepage_url             = optional(string, null)
    pull_request_bypassers   = optional(list(string), [])
  })

  description = "Details about the GitHub repository, including owner, name, description, topics, and branch/tag policies. Set the configure option to false only if you already setup the repository for another cloud service provider or environment in the same project."
}

variable "core_state" {
  type = object({
    resource_group_name  = string
    storage_account_name = string
    container_name       = string
    key                  = string
  })

  description = "Details about the Azure Storage Account used to store the Terraform state file."
}

variable "tags" {
  type        = map(any)
  description = "Map of tags to apply to all created resources."
}
