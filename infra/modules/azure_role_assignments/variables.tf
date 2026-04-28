variable "principal_id" {
  description = <<EOT
  The ID of the principal (user, group, service principal, or managed identity) to which roles will be assigned.
  For managed identities, use the principal_id output from the identity resource.
  EOT
  type        = string
}

variable "subscription_id" {
  description = "The ID of the subscription where the target resources are located."
  type        = string
}

variable "cosmos" {
  description = <<EOT
List of role assignments for Azure Cosmos DB accounts.

REQUIRED FIELDS:
- account_name: Name of the Cosmos DB account
- resource_group_name: Resource group containing the account
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- description: Human-readable description of the role assignment purpose

OPTIONAL FIELDS:
- database: Database name (default: "*" for all databases)
- collections: List of collection names (default: ["*"] for all collections)
EOT
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
  description = <<EOT
List of role assignments for Azure Cache for Redis instances.

REQUIRED FIELDS:
- cache_name: Name of the Redis cache instance
- resource_group_name: Resource group containing the cache
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- username: Redis username for the access policy (used in Redis ACLs)
- description: Human-readable description of the role assignment purpose
EOT
  type = list(object({
    cache_name          = string
    resource_group_name = string
    role                = string
    username            = string
    description         = string
  }))

  default = []
}

variable "managed_redis" {
  description = <<EOT
List of role assignments for Azure Managed Redis (AMR) instances.

REQUIRED FIELDS:
- id: Full Azure resource ID of the Azure Managed Redis instance
  (e.g., /subscriptions/{subId}/resourceGroups/{rgName}/providers/Microsoft.Cache/redisEnterprise/{name})
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- description: Human-readable description of the role assignment purpose

Role mapping:
- reader → Azure Managed Redis Reader (control-plane read-only)
- writer → data-plane "default" access policy (Redis commands)
- owner  → Azure Managed Redis Contributor (control-plane) + data-plane "default" access policy

Note: this variable targets Azure Managed Redis. For legacy Azure Cache for
Redis, use the `redis` variable instead.
EOT
  type = list(object({
    id          = string
    role        = string
    description = string
  }))

  validation {
    condition = alltrue([
      for entry in var.managed_redis :
      can(provider::azurerm::parse_resource_id(entry.id))
      && lower(provider::azurerm::parse_resource_id(entry.id)["resource_provider"]) == "microsoft.cache"
      && lower(provider::azurerm::parse_resource_id(entry.id)["resource_type"]) == "redisenterprise"
    ])
    error_message = "Each id must be a valid Microsoft.Cache/redisEnterprise resource ID."
  }

  validation {
    condition = alltrue([
      for entry in var.managed_redis : contains(["reader", "writer", "owner"], entry.role)
    ])
    error_message = "Each role must be one of: reader, writer, owner."
  }

  validation {
    condition     = length(var.managed_redis) == length(distinct([for entry in var.managed_redis : "${entry.id}|${entry.role}"]))
    error_message = "Each (id, role) combination must appear at most once."
  }

  default = []
}

variable "key_vault" {
  description = <<EOT
List of role assignments for Azure Key Vault instances.

REQUIRED FIELDS:
- name: Name of the Key Vault
- resource_group_name: Resource group containing the Key Vault
- description: Human-readable description of the role assignment purpose
- roles: Object specifying base permissions for each Key Vault functionality:
  - secrets: Role for secrets - MUST be one of: "reader", "writer", "owner", or not set (empty for no access)
  - certificates: Role for certificates - MUST be one of: "reader", "writer", "owner", or not set (empty for no access)
  - keys: Role for keys - MUST be one of: "reader", "writer", "owner", or not set (empty for no access)

OPTIONAL FIELDS:
- has_rbac_support: Set to true if Key Vault uses Azure RBAC for authorization (default: true, access policies will be created for vaults without RBAC support otherwise, role assignments for vaults with RBAC support)
- override_roles: Advanced - list of Access Policies permissions to override module-defined ones. Has no effect when has_rbac_support is true.
EOT
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
  description = <<EOT
List of role assignments for Azure Storage Tables.

REQUIRED FIELDS:
- storage_account_name: Name of the Storage Account
- resource_group_name: Resource group containing the Storage Account
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- description: Human-readable description of the role assignment purpose

OPTIONAL FIELDS:
- table_name: Specific table name (default: "*" for all tables)
- table_resource_manager_id: Azure Resource Manager ID of a specific table (alternative to table_name for granular scope)
EOT
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
  description = <<EOT
List of role assignments for Azure Storage Blob containers.

REQUIRED FIELDS:
- storage_account_name: Name of the Storage Account
- resource_group_name: Resource group containing the Storage Account
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- description: Human-readable description of the role assignment purpose

OPTIONAL FIELDS:
- container_name: Specific container name (default: "*" for all containers)
- container_resource_manager_id: Azure Resource Manager ID of a specific container (alternative to container_name for granular scope)
EOT
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
  description = <<EOT
List of role assignments for Azure Storage Queues.

REQUIRED FIELDS:
- storage_account_name: Name of the Storage Account
- resource_group_name: Resource group containing the Storage Account
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- description: Human-readable description of the role assignment purpose

OPTIONAL FIELDS:
- queue_name: Specific queue name (default: "*" for all queues)
- queue_resource_manager_id: Azure Resource Manager ID of a specific queue (alternative to queue_name for granular scope)
EOT
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
  description = <<EOT
List of role assignments for Azure Event Hubs.

REQUIRED FIELDS:
- namespace_name: Name of the Event Hubs namespace
- resource_group_name: Resource group containing the namespace
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- description: Human-readable description of the role assignment purpose

OPTIONAL FIELDS:
- event_hub_names: List of specific Event Hub names within the namespace (default: ["*"] for all Event Hubs)
EOT
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
  description = <<EOT
List of role assignments for Azure API Management (APIM) instances.

REQUIRED FIELDS:
- name: Name of the API Management instance
- resource_group_name: Resource group containing the APIM instance
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- description: Human-readable description of the role assignment purpose
EOT
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
List of role assignments for Azure Service Bus.

REQUIRED FIELDS:
- namespace_name: Name of the Service Bus namespace
- resource_group_name: Resource group containing the namespace
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- description: Human-readable description of the role assignment purpose

OPTIONAL FIELDS:
- queue_names: List of specific queue names (default: [] for namespace-level access only)
- topic_names: List of specific topic names (default: [] for namespace-level access only)
- subscriptions: Map of topic names to lists of subscription names. Each key is a topic name, each value is a list of subscription names under that topic.
EOT
  type = list(object({
    namespace_name      = string
    resource_group_name = string
    queue_names         = optional(list(string), [])
    topic_names         = optional(list(string), [])
    subscriptions       = optional(map(list(string)), {})
    role                = string
    description         = string
  }))

  default = []
}

variable "app_config" {
  description = <<EOT
List of role assignments for Azure App Configuration stores.

REQUIRED FIELDS:
- name: Name of the App Configuration store
- resource_group_name: Resource group containing the App Configuration store
- role: Permission level - MUST be one of: "reader", "writer", "owner"
- description: Human-readable description of the role assignment purpose
EOT
  type = list(object({
    name                = string
    resource_group_name = string
    role                = string
    description         = string
  }))

  default = []
}
