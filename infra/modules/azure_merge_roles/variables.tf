variable "scope" {
  description = "ARM scope where the custom role definition is created. Use a management group, subscription, resource group, or resource scope ID."
  type        = string

  validation {
    condition = (
      startswith(var.scope, "/subscriptions/") ||
      startswith(var.scope, "/providers/Microsoft.Management/managementGroups/")
    )
    error_message = "scope must be a valid ARM scope starting with '/subscriptions/' or '/providers/Microsoft.Management/managementGroups/'."
  }
}

variable "role_name" {
  description = "Name of the custom role definition to create."
  type        = string

  validation {
    condition     = trimspace(var.role_name) != ""
    error_message = "role_name must not be empty."
  }
}

variable "source_roles" {
  description = "List of at least two Azure role names to merge into a custom role definition. Roles can be built-in or custom, as long as they are resolvable at scope."
  type        = list(string)

  validation {
    condition     = length(var.source_roles) > 0
    error_message = "source_roles must contain at least one Azure role name."
  }

  validation {
    condition     = length(var.source_roles) == 0 || length(var.source_roles) >= 2
    error_message = "source_roles must contain at least two Azure role names. If you only need one role, assign it directly instead of creating an equivalent custom role."
  }

  validation {
    condition     = length(var.source_roles) == length(distinct(var.source_roles))
    error_message = "source_roles must not contain duplicates."
  }
}

variable "assignable_scopes" {
  description = "Optional list of scopes where the custom role can be assigned. Defaults to [scope]."
  type        = list(string)
  default     = null

  validation {
    condition     = var.assignable_scopes == null || length(var.assignable_scopes) > 0
    error_message = "assignable_scopes must be null or contain at least one scope."
  }

  validation {
    # For subscription scopes we can validate strict parent-child relationships.
    # For management group scopes Azure can target the management group itself
    # and descendant subscriptions, but Terraform cannot infer that hierarchy
    # from an ARM ID string alone, so we only validate the scope shape.
    condition = var.assignable_scopes == null || alltrue([
      for assignable_scope in var.assignable_scopes : (
        startswith(var.scope, "/subscriptions/")
        ? startswith(assignable_scope, var.scope)
        : (
          startswith(assignable_scope, "/providers/Microsoft.Management/managementGroups/") ||
          startswith(assignable_scope, "/subscriptions/")
        )
      )
    ])
    error_message = "For subscription scopes, every assignable scope must match or be a child of scope. For management group scopes, assignable scopes must be management group or subscription scopes."
  }

  validation {
    condition     = var.assignable_scopes == null || length(var.assignable_scopes) == length(distinct(var.assignable_scopes))
    error_message = "assignable_scopes must not contain duplicates."
  }
}

variable "description" {
  description = "Optional custom description for the merged role definition. Defaults to a generated description based on source_roles."
  type        = string
  default     = null

  validation {
    condition     = var.description == null || trimspace(var.description) != ""
    error_message = "description must be null or a non-empty string."
  }
}
