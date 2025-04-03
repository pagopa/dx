variable "repository" {
  type = object({
    name                = string
    description         = string
    topics              = list(string)
    default_branch_name = optional(string, "main")
    jira_boards_ids     = optional(list(string), [])
  })

  description = "Information about this repository"
}
