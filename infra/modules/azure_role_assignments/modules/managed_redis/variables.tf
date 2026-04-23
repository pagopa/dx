variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "managed_redis" {
  description = <<EOT
List of Azure Managed Redis (AMR) instance resource IDs to grant data-plane access to.

Each entry is a full Azure resource ID, e.g.:
  /subscriptions/{subId}/resourceGroups/{rgName}/providers/Microsoft.Cache/redisEnterprise/{name}

AMR assigns the built-in "default" access policy (full data-plane access).
There are no role choices; access is binary (granted or not).
EOT
  type        = list(string)

  default = []
}
