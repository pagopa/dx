variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
}

variable "tags" {
  type = map(string)
}

variable "app_service_plan_id" {
  type = string
}

# variable "subnet_pep_id" {
#   type = string
# }

# variable "subnet_id" {
#   type = string
# }

variable "resource_group_name" {
  type = string
}
# variable "virtual_network" {
#   type = object({
#     name                = string
#     resource_group_name = string
#   })
# }