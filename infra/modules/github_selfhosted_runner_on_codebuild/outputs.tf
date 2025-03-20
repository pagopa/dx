output "iam_role" {
  value = {
    name = aws_iam_role.codebuild_role.name
    arn  = aws_iam_role.codebuild_role.arn
  }
}

output "security_group" {
  value = {
    name = aws_security_group.codebuild.name
    id   = aws_security_group.codebuild.id
  }
}