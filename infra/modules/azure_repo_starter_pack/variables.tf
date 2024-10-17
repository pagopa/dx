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
    admins    = string
    devs      = string
    externals = optional(string)
  })

  description = "Azure Entra Id groups to give role to"
}
