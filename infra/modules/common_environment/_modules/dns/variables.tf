# variable "project" {
#   type        = string
#   description = "IO prefix, short environment and short location"
# }

variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

# variable "location" {
#   type        = string
#   description = "Location"
# }

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

# variable "dns_default_ttl_sec" {
#   type        = number
#   default     = 3600
#   description = "Default TTL of DNS records"
# }

variable "virtual_network" {
  type = object({
    id   = string
    name = string
  })
  description = "Virtual network where to attach private dns zones"
}