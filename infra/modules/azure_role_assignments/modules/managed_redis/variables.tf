variable "principal_id" {
  description = "The ID of the principal to which assign roles. It can be a managed identity."
  type        = string
}

variable "managed_redis" {
  description = <<EOT
List of Azure Managed Redis (AMR) role assignments.

Each entry contains:
- id:   Full Azure resource ID of the AMR instance
- role: One of "reader", "writer", or "owner"

Role mapping:
- reader → Azure Managed Redis Reader (control-plane read-only)
- writer → data-plane "default" access policy (Redis commands)
- owner  → Azure Managed Redis Contributor (control-plane) + data-plane "default" access policy
EOT
  type = list(object({
    id   = string
    role = string
  }))

  default = []
}
