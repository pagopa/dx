variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "entraid_groups" {
  type = object({
    admins_object_id    = string
    devs_object_id      = string
    externals_object_id = optional(string, null)
  })

  description = "Azure Entra Id groups to give role to"
}

variable "terraform_storage_account" {
  type = object({
    resource_group_name = string
    name                = string
  })

  description = "Name and resource group name of the Storage Account hosting the Terraform state file"
}

variable "subscription_id" {
  type        = string
  description = "The subscription ID where resources are created"
}

variable "tenant_id" {
  type        = string
  description = "The tenant ID where resources are created"
}

variable "repository" {
  type = object({
    owner           = optional(string, "pagopa")
    name            = string
    description     = string
    topics          = list(string)
    reviewers_teams = list(string)
  })

  description = "Information about this repository"
}

variable "github_private_runner" {
  type = object({
    container_app_environment_id       = string
    container_app_environment_location = string
    polling_interval_in_seconds        = optional(number, 30)
    min_instances                      = optional(number, 0)
    max_instances                      = optional(number, 30)
    labels                             = optional(list(string), [])
    key_vault = object({
      name                = string
      resource_group_name = string
      secret_name         = optional(string, "github-runner-pat")
    })
    cpu    = optional(number, 0.5)
    memory = optional(string, "1Gi")
  })
}
