variable "tags" {
  type        = map(any)
  description = "Map of tags to apply to all created resources."
}

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

variable "virtual_network_cidr" {
  type        = string
  description = "CIDR for the virtual network"
}

variable "nat_enabled" {
  type        = bool
  default     = true
  description = "Enable NAT for the virtual network"
}
