variable "github_pat" {
  type        = string
  description = "GitHub PAT to use for authentication as an alternative to AWS Codeconnection."
  sensitive   = true
}