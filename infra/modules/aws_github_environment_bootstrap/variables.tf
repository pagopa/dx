variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "repository" {
  type = object({
    owner                    = optional(string, "pagopa")
    name                     = string
    reviewers_teams          = list(string)
    infra_cd_policy_branches = optional(set(string), ["main"])
    app_cd_policy_branches   = optional(set(string), ["main"])
    infra_cd_policy_tags     = optional(set(string), [])
    app_cd_policy_tags       = optional(set(string), [])
    create_environments      = optional(bool, true)
  })

  description = "Details about the GitHub repository, including owner, name, description, topics, and branch/tag policies. Set the configure option to false only if you already setup the repository for another cloud service provider or environment in the same project. Set the create_environments option to false if you're configuring a multi cloud repository."
}
