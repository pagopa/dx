variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    instance_number = string
  })
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to setup resources"
}
