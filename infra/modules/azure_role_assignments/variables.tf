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
    description         = string
    database            = optional(string, "*")
    collections         = optional(list(string), ["*"])
  }))

  default = []
}

variable "redis" {
  description = "A list of Redis role assignments"
  type = list(object({
    cache_name          = string
    resource_group_name = string
    role                = string
    username            = string
    description         = string
  }))

  default = []
}

variable "key_vault" {
  description = "A list of key vault role assignments"
  type = list(object({
    name                = string
    resource_group_name = string
    has_rbac_support    = optional(bool, null)
    description         = string
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

  default = []
}

variable "storage_table" {
  description = "A list of storage table role assignments"
  type = list(object({
    storage_account_name      = string
    resource_group_name       = string
    table_name                = optional(string, "*")
    table_resource_manager_id = optional(string, null)
    role                      = string
    description               = string
  }))

  default = []
}


variable "storage_blob" {
  description = "A list of storage blob role assignments"
  type = list(object({
    storage_account_name          = string
    resource_group_name           = string
    container_name                = optional(string, "*")
    container_resource_manager_id = optional(string, null)
    role                          = string
    description                   = string
  }))

  default = []
}

variable "storage_queue" {
  description = "A list of storage queue role assignments"
  type = list(object({
    storage_account_name      = string
    resource_group_name       = string
    queue_name                = optional(string, "*")
    queue_resource_manager_id = optional(string, null)
    role                      = string
    description               = string
  }))

  default = []
}

variable "event_hub" {
  description = "A list of event hub role assignments"
  type = list(object({
    namespace_name      = string
    resource_group_name = string
    event_hub_names     = optional(list(string), ["*"])
    role                = string
    description         = string
  }))

  default = []
}

variable "apim" {
  description = "A list of APIM role assignments"
  type = list(object({
    name                = string
    resource_group_name = string
    role                = string
    description         = string
  }))

  default = []
}
