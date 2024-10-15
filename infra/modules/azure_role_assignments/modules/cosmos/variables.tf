variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "cosmos" {
  description = "A list of CosmosDB role assignments"
  type = list(object({
    account_name        = optional(string)
    account_id          = optional(string)
    resource_group_name = string
    role                = string
    database            = optional(string, "*")
    collections         = optional(list(string), ["*"])
  }))

  validation {
    condition = alltrue([
      for assignment in var.cosmos : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition = length([
      for assignment in flatten([
        for entry in var.cosmos : [
          for collection in entry.collections : {
            account_name        = entry.account_name
            account_id          = entry.account_id
            resource_group_name = entry.resource_group_name
            role                = entry.role
            database            = entry.database
            collection          = collection
          }
        ]
      ]) : assignment
      ]) == length(distinct([
        for assignment in flatten([
          for entry in var.cosmos : [
            for collection in entry.collections : {
              account_name        = entry.account_name
              account_id          = entry.account_id
              resource_group_name = entry.resource_group_name
              role                = entry.role
              database            = entry.database
              collection          = collection
            }
          ]
        ]) : assignment
    ]))
    error_message = "Each assignment must be unique."
  }

  validation {
    condition = alltrue([
      for assignment in var.cosmos : (assignment.account_name != null || assignment.account_id != null)
    ])
    error_message = "Either account_name or account_id must be populated."
  }

  default = []
}