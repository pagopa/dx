output "id" {
  description = "The ID of the GitHub repository."
  value       = github_repository.this.id
}

output "name" {
  description = "The name of the GitHub repository."
  value       = github_repository.this.name
}
