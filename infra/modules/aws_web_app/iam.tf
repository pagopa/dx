data "aws_iam_policy_document" "amplify" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["amplify.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "${local.project}-${var.environment.app_name}-amplify-role-${var.environment.instance_number}"
  description        = "Role to assume in the application"
  assume_role_policy = data.aws_iam_policy_document.amplify.json
}
