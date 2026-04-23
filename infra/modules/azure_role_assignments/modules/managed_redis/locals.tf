locals {
  # The input is a list of validated Azure Managed Redis resource IDs.
  # Convert to a set for for_each; each ID is passed directly to the
  # resource as managed_redis_id.
  assignments = toset(var.managed_redis)
}
