output "repository" {
  description = "Details of the GitHub repository."
  value = {
    name = var.repository.name
  }
}

output "identities" {
  description = "Details of the IAM roles for app, infra, including ARNs and names."
  sensitive   = true
  value = {
    app = {
      ci = {
        arn  = aws_iam_role.app_ci.arn
        name = aws_iam_role.app_ci.name
      }
      cd = {
        arn  = aws_iam_role.app_cd.arn
        name = aws_iam_role.app_cd.name
      }
    }
    infra = {
      ci = {
        arn  = aws_iam_role.infra_ci.arn
        name = aws_iam_role.infra_ci.name
      }
      cd = {
        arn  = aws_iam_role.infra_cd.arn
        name = aws_iam_role.infra_cd.name
      }
    }
  }
}
