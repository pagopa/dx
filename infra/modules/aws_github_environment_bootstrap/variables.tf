variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    region          = string
    domain          = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and region short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "repository" {
  type = object({
    owner = optional(string, "pagopa")
    name  = string
  })

  description = "Details about the GitHub repository, including owner and name."
}
