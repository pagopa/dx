locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_merge_roles/tests"
    ManagementTeam = "Developer Experience"
    TestSuite      = "e2e"
    TestName       = "Azure Merge Roles RBAC"
  }

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "e2e"
    app_name        = "mrg"
    instance_number = format("%02d", random_integer.instance_number.result)
  }

  docker_image   = "ghcr.io/pagopa/e2e-azure-merge-roles-blob-rbac:latest"
  container_name = "probe"

  role_names = {
    source_blob_rw_without_delete      = "dx-e2e-blob-rw-without-delete-source-${local.environment.instance_number}"
    source_blob_read_only              = "dx-e2e-blob-read-only-source-${local.environment.instance_number}"
    source_blob_delete_only            = "dx-e2e-blob-delete-only-source-${local.environment.instance_number}"
    merged_limited                     = "dx-e2e-blob-merged-no-delete-${local.environment.instance_number}"
    merged_full                        = "dx-e2e-blob-merged-delete-${local.environment.instance_number}"
    source_container_rw_without_delete = "dx-e2e-container-rw-no-delete-source-${local.environment.instance_number}"
    source_container_read_only         = "dx-e2e-container-read-only-source-${local.environment.instance_number}"
    source_container_delete_only       = "dx-e2e-container-delete-only-source-${local.environment.instance_number}"
    merged_control_limited             = "dx-e2e-container-merged-no-delete-${local.environment.instance_number}"
    merged_control_full                = "dx-e2e-container-merged-delete-${local.environment.instance_number}"
  }
}
