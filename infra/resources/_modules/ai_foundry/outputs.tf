output "project_id" {
  value       = azurerm_cognitive_account_project.terraform_ci.id
  description = "Resource ID of the Foundry project, used as the scope for the project-level \"Foundry User\" role assignment."
}

output "name" {
  value       = azurerm_cognitive_account.this.name
  description = "The name of the AI Foundry account."
}

output "project_endpoint" {
  value       = azurerm_cognitive_account_project.terraform_ci.endpoints["AI Foundry API"]
  description = "Foundry project data-plane endpoint used by the Agents service."
}

output "model_deployment_name" {
  value       = azurerm_cognitive_deployment.gpt_5_5.name
  description = "The name of the model deployment exposed for inference."
}
