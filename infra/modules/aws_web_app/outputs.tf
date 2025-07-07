output "iam_role" {
  value = {
    name = aws_iam_role.this.name
    arn  = aws_iam_role.this.arn
  }
}

output "app" {
  value = {
    name = aws_amplify_app.this.name
    arn  = aws_amplify_app.this.arn
  }
}