variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "cosmos" {
  description = "A list of CosmosDB role assignments"
  type = list(object({
    account_name        = string
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
    condition     = length([
    for assignment in flatten([
      for entry in var.cosmos : [
        for collection in entry.collections : {
          account_name        = entry.account_name
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

  default = []
}

variable "redis" {
  description = "A list of Redis role assignments"
  type = list(object({
    cache_name          = string
    resource_group_name = string
    role                = string
    username            = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.redis : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.redis) == length(distinct(var.redis))
    error_message = "Each assignment must be unique. Found ${length(var.redis) - length(distinct(var.redis))} duplicates."
  }

  default = []
}

variable "key_vault" {
  description = "A list of key vault role assignments"
  type = list(object({
    name                = string
    resource_group_name = string
    roles = object({
      secrets      = optional(string, "")
      certificates = optional(string, "")
      keys         = optional(string, "")
    })

    override_roles = optional(object({
      secrets      = optional(list(string), [])
      certificates = optional(list(string), [])
      keys         = optional(list(string), [])
      }), {
      secrets      = []
      certificates = []
      keys         = []
    })
  }))

  validation {
    condition = alltrue([
      for assignment in var.key_vault : contains(["reader", "writer", "owner", ""], try(assignment.roles.secrets, "")) && contains(["reader", "writer", "owner", ""], try(assignment.roles.certificates, "")) && contains(["reader", "writer", "owner", ""], try(assignment.roles.keys, ""))
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.key_vault) == length(distinct(var.key_vault))
    error_message = "Each assignment must be unique. Found ${length(var.key_vault) - length(distinct(var.key_vault))} duplicates."
  }

  default = []
}

variable "storage_table" {
  description = "A list of storage table role assignments"
  type = list(object({
    storage_account_name = string
    resource_group_name  = string
    table_name           = optional(string, "*")
    role                 = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.storage_table : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.storage_table) == length(distinct(var.storage_table))
    error_message = "Each assignment must be unique. Found ${length(var.storage_table) - length(distinct(var.storage_table))} duplicates."
  }

  default = []
}


variable "storage_blob" {
  description = "A list of storage blob role assignments"
  type = list(object({
    storage_account_name = string
    resource_group_name  = string
    container_name       = optional(string, "*")
    role                 = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.storage_blob : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.storage_blob) == length(distinct(var.storage_blob))
    error_message = "Each assignment must be unique. Found ${length(var.storage_blob) - length(distinct(var.storage_blob))} duplicates."
  }

  default = []
}

variable "storage_queue" {
  description = "A list of storage queue role assignments"
  type = list(object({
    storage_account_name = string
    resource_group_name  = string
    queue_name           = optional(string, "*")
    role                 = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.storage_queue : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.storage_queue) == length(distinct(var.storage_queue))
    error_message = "Each assignment must be unique. Found ${length(var.storage_queue) - length(distinct(var.storage_queue))} duplicates."
  }

  default = []
}

variable "event_hub" {
  description = "A list of event hub role assignments"
  type = list(object({
    namespace_name      = string
    resource_group_name = string
    event_hub_names     = optional(list(string), ["*"])
    role                = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.event_hub : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition = length([
      for assignment in flatten([
        for entry in var.event_hub : [
          for event_hub_name in entry.event_hub_names : {
            namespace_name      = entry.namespace_name
            resource_group_name = entry.resource_group_name
            role                = entry.role
            event_hub_name      = event_hub_name
          }
        ]
      ]) : assignment
      ]) == length(distinct([
        for assignment in flatten([
          for entry in var.event_hub : [
            for event_hub_name in entry.event_hub_names : {
              namespace_name      = entry.namespace_name
              resource_group_name = entry.resource_group_name
              role                = entry.role
              event_hub_name      = event_hub_name
            }
          ]
        ]) : assignment
    ]))
    error_message = "Each assignment must be unique."
  }

  default = []
}