output "container_app_job_name" {
  value = module.runner.container_app_job.name
}

output "runner_label" {
  value = local.runner_label
}

output "key_vault_name" {
  value = azurerm_key_vault.test.name
}
