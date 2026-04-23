variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "subscription_id" {
  description = "The ID of the subscription where the target Azure Managed Redis instances are located."
  type        = string
}

variable "managed_redis" {
  description = <<EOT
List of data-plane access policy assignments for Azure Managed Redis (AMR) instances.

REQUIRED FIELDS:
- name: Name of the Azure Managed Redis instance
- resource_group_name: Resource group containing the instance
- role: Permission level - MUST be one of: "writer", "owner". Both roles are mapped
  to the built-in "default" access policy (full data-plane access). The "reader"
  role is intentionally not supported because AMR has no built-in read-only
  policy; read-only access requires a custom access policy declared on the AMR
  database and will be addressed in a separate change.
- description: Human-readable description of the role assignment purpose.
EOT
  type = list(object({
    name                = string
    resource_group_name = string
    role                = string
    description         = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.managed_redis : contains(["writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"writer\" or \"owner\". Azure Managed Redis has no built-in read-only policy, so \"reader\" is not supported by this sub-module."
  }

  validation {
    # At the Azure API level a principal can hold a single access policy
    # assignment per AMR instance (always on the built-in "default" policy).
    # Two entries targeting the same (name, resource_group_name) pair would
    # collide at plan/apply time, so we reject duplicates up-front.
    condition = length([
      for assignment in var.managed_redis : "${assignment.name}|${assignment.resource_group_name}"
      ]) == length(distinct([
        for assignment in var.managed_redis : "${assignment.name}|${assignment.resource_group_name}"
    ]))
    error_message = "Each (name, resource_group_name) pair must appear at most once in var.managed_redis."
  }

  default = []
}
