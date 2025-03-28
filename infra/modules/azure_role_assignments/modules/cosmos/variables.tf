variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "subscription_id" {
  description = "The ID of the subscription where the target resources are located"
  type        = string
}

variable "cosmos" {
  description = "A list of CosmosDB role assignments"
  type = list(object({
    account_name        = string
    resource_group_name = string
    role                = string
    description         = string
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
            account_id = entry.account_id
            role       = entry.role
            database   = entry.database
            collection = collection
          }
        ]
      ]) : assignment
      ]) == length(distinct([
        for assignment in flatten([
          for entry in var.cosmos : [
            for collection in entry.collections : {
              account_id = entry.account_id
              role       = entry.role
              database   = entry.database
              collection = collection
            }
          ]
        ]) : assignment
    ]))
    error_message = "Each assignment must be unique."
  }

  default = []
}
