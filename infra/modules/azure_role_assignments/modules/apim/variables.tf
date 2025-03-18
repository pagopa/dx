variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "apim" {
  description = "A list of APIM role assignments"
  type = list(object({
    id          = string
    role        = string
    description = string
  }))

  validation {
    condition = alltrue([
      for assignment in var.apim : contains(["reader", "writer", "owner"], assignment.role)
    ])
    error_message = "The role must be set either to \"reader\", \"writer\" or \"owner\""
  }

  validation {
    condition     = length(var.apim) == length(distinct(var.apim))
    error_message = "Each assignment must be unique. Found ${length(var.apim) - length(distinct(var.apim))} duplicates."
  }

  default = []
}
