# EventBridge Rule for Amplify notifications

resource "aws_cloudwatch_event_rule" "amplify_app_branch" {
  for_each    = var.monitoring.enabled ? toset([aws_amplify_branch.this.branch_name]) : []
  name        = "amplify-${aws_amplify_app.this.id}-${aws_amplify_branch.this.branch_name}-branch-notification"
  description = "AWS Amplify build notifications for :  App: ${aws_amplify_app.this.id} Branch: ${aws_amplify_branch.this.branch_name}"

  event_pattern = jsonencode({
    "detail" = {
      "appId" = [
        aws_amplify_app.this.id
      ]
      "branchName" = [
        aws_amplify_branch.this.branch_name
      ],
      "jobStatus" = [
        "SUCCEED",
        "FAILED"
      ]
    }
    "detail-type" = [
      "Amplify Deployment Status Change"
    ]
    "source" = [
      "aws.amplify"
    ]
  })
  tags = var.tags
}

resource "aws_cloudwatch_event_target" "amplify_app_branch" {
  for_each  = var.monitoring.enabled ? toset([aws_amplify_branch.this.branch_name]) : []
  rule      = aws_cloudwatch_event_rule.amplify_app_branch[each.value].name
  target_id = aws_amplify_branch.this.branch_name
  arn       = aws_sns_topic.amplify_app_branch[each.value].arn

  input_transformer {
    input_paths = {
      jobId  = "$.detail.jobId"
      appId  = "$.detail.appId"
      region = "$.region"
      branch = "$.detail.branchName"
      status = "$.detail.jobStatus"
    }

    input_template = "\"Build notification from the AWS Amplify Console for app: https://<branch>.<appId>.amplifyapp.com/. Your build status is <status>. Go to https://console.aws.amazon.com/amplify/home?region=<region>#<appId>/<branch>/<jobId> to view details on your build. \""
  }
}

# SNS Topic for Amplify notifications

resource "aws_sns_topic" "amplify_app_branch" {
  for_each = var.monitoring.enabled ? toset([aws_amplify_branch.this.branch_name]) : []
  name     = "amplify-${aws_amplify_app.this.id}_${aws_amplify_branch.this.branch_name}"
  tags     = var.tags
}

data "aws_iam_policy_document" "amplify_app_branch" {
  for_each = var.monitoring.enabled ? toset([aws_amplify_branch.this.branch_name]) : []
  statement {
    sid = "Allow_Publish_Events ${aws_amplify_branch.this.arn}"

    effect = "Allow"

    actions = [
      "SNS:Publish",
    ]

    principals {
      type = "Service"
      identifiers = [
        "events.amazonaws.com",
      ]
    }

    resources = [
      aws_sns_topic.amplify_app_branch[each.value].arn,
    ]
  }
}

resource "aws_sns_topic_policy" "amplify_app_branch" {
  for_each = var.monitoring.enabled ? toset([aws_amplify_branch.this.branch_name]) : []
  arn      = aws_sns_topic.amplify_app_branch[each.value].arn
  policy   = data.aws_iam_policy_document.amplify_app_branch[each.value].json
}

resource "aws_sns_topic_subscription" "this" {
  for_each  = var.monitoring.enabled ? toset(var.monitoring.target_emails) : []
  topic_arn = aws_sns_topic.amplify_app_branch[aws_amplify_branch.this.branch_name].arn
  protocol  = "email"
  endpoint  = each.value
}