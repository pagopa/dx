variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "subscription_id" {
  description = "The ID of the subscription where the target resources are located."
  type        = string
}

variable "cosmos" {
  description = "A list of role assignments for Azure Cosmos DB accounts, specifying the account name, resource group, role, and optional database and collections. Defaults to all databases and collections if not specified."
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
  description = "A list of role assignments for Azure Redis Cache instances, specifying the cache name, resource group, role, username, and description."
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
  description = "A list of role assignments for Azure Key Vaults, including optional RBAC support and role overrides for secrets, certificates, and keys. Indicates if the Key Vault has RBAC enabled and allows overriding roles for specific functionalities."
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
  description = "A list of role assignments for Azure Storage Tables, specifying the storage account, resource group, table name, and role. Defaults to all tables if the table name is not specified."
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
  description = "A list of role assignments for Azure Storage Blobs, specifying the storage account, resource group, container name, and role. Defaults to all containers if the container name is not specified."
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
  description = "A list of role assignments for Azure Storage Queues, specifying the storage account, resource group, queue name, and role. Defaults to all queues if the queue name is not specified."
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
  description = "A list of role assignments for Azure Event Hubs, specifying the namespace, resource group, event hub names, and role. Defaults to all event hubs if the event hub names are not specified."
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
  description = "A list of role assignments for Azure API Management (APIM) instances, specifying the APIM name, resource group, and role."
  type = list(object({
    name                = string
    resource_group_name = string
    role                = string
    description         = string
  }))

  default = []
}

variable "service_bus" {
  description = <<EOT
  A list of role assignments for Azure Service Bus, specifying the namespace, resource group, and role.
  For queues and topics, list the names. For subscriptions, pair the related topic and the subscription in a map object.

  Example for `subscriptions` map object:
  {
    topic1 = "subscription1",
    topic2 = "subscription2"
  }
  EOT
  type = list(object({
    namespace_name      = string
    resource_group_name = string
    queue_names         = optional(list(string), [])
    topic_names         = optional(list(string), [])
    subscriptions       = optional(map(string), {})
    role                = string
    description         = string
  }))

  default = []
}
