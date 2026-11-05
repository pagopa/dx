variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "repository" {
  type = object({
    owner    = optional(string, "pagopa")
    name     = string
    owner_id = optional(number)
  })

  description = "Details about the GitHub repository, including owner, optional positive integer owner ID, and name."

  validation {
    condition = var.repository.owner_id == null ? true : (
      var.repository.owner_id > 0 &&
      floor(var.repository.owner_id) == var.repository.owner_id
    )
    error_message = "repository.owner_id must be a positive integer when set."
  }
}

variable "core_state" {
  type = object({
    resource_group_name  = string
    storage_account_name = string
    container_name       = string
    key                  = string
  })

  description = "Details about the Azure Storage Account used to store the Terraform state file."
}

variable "resource_group_ids" {
  type        = list(string)
  description = "List of resource group IDs to be added to the bootstrapper role assignments."
  default     = []
}

variable "tags" {
  type        = map(any)
  description = "Map of tags to apply to all created resources."
}
