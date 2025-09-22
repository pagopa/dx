variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    region          = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}
