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
    condition     = length(var.source_roles) >= 2
    error_message = "source_roles must contain at least two Azure role names. If you only need one role, assign it directly instead of creating an equivalent custom role."
  }

  validation {
    condition     = length(var.source_roles) == length(distinct(var.source_roles))
    error_message = "source_roles must not contain duplicates."
  }
}

variable "reason" {
  description = "Short explanation of why this merged role exists. Used to build the custom role description together with the merged source role names."
  type        = string

  validation {
    condition     = trimspace(var.reason) != ""
    error_message = "reason must not be empty."
  }
}
