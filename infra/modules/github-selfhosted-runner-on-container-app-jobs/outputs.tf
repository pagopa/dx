output "container_app_job" {
  value = {
    id                  = module.container_app_job_selfhosted_runner.id
    name                = module.container_app_job_selfhosted_runner.name
    resource_group_name = module.container_app_job_selfhosted_runner.resource_group_name
  }
}
