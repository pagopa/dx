locals {
  control_plane_role_name = {
    reader = "Azure Managed Redis Reader"
    owner  = "Azure Managed Redis Contributor"
  }

  # Control-plane assignments: reader and owner roles
  control_plane_assignments = {
    for entry in var.managed_redis :
    "${entry.id}|${entry.role}" => entry
    if contains(["reader", "owner"], entry.role)
  }

  # Data-plane assignments: writer and owner roles.
  # Keyed by id only — the underlying Azure resource is one assignment per
  # (managed_redis_id, object_id), so we deduplicate when both writer and
  # owner target the same AMR instance.
  data_plane_assignments = {
    for entry in var.managed_redis :
    entry.id => entry
    if contains(["writer", "owner"], entry.role)
  }
}
