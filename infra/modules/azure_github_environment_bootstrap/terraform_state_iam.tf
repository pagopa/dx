resource "azurerm_role_assignment" "terraform_state_upstream_reader" {
  for_each = local.terraform_state_upstream_reader_assignments

  scope                = startswith(lower(each.value.container), "/subscriptions/") ? each.value.container : "${local.tf_storage_account.id}/blobServices/default/containers/${each.value.container}"
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = each.value.principal_id
  description          = "Allow ${var.repository.name} to read a declared Terraform state upstream"

  lifecycle {
    precondition {
      condition = length(distinct([
        for container in keys(try(var.terraform_state_container_access.upstream, {})) :
        lower(startswith(lower(container), "/subscriptions/") ? container : "${local.tf_storage_account.id}/blobServices/default/containers/${container}")
      ])) == length(try(var.terraform_state_container_access.upstream, {}))
      error_message = "Declare each effective upstream container once and combine its readers."
    }
  }
}
