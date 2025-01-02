variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group for the Container App Job"
  default     = null
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    instance_number = number
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "repository" {
  type = object({
    owner = optional(string, "pagopa")
    name  = string
  })
}

variable "container_app_environment" {
  type = object({
    id                          = string
    location                    = string
    polling_interval_in_seconds = optional(number, 30)
    min_instances               = optional(number, 0)
    max_instances               = optional(number, 30)
    use_labels                  = optional(bool, false)
    cpu                         = optional(number, 0.5)
    memory                      = optional(string, "1Gi")
  })
  description = "Name and resource group of the Container App Environment to use as host"
}

variable "key_vault" {
  type = object({
    name                = string
    resource_group_name = string
    use_rbac            = optional(bool, false)
    secret_name         = optional(string, "github-runner-pat")
  })
  description = "Details of the KeyVault holding secrets for this job"
}
