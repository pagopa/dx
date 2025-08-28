#trivy:ignore:AVD-AWS-0025
resource "aws_dynamodb_table" "tags" {
  name = "${local.app_prefix}-cache-tags-${local.app_suffix}"

  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "tag"
  range_key = "path"

  attribute {
    name = "tag"
    type = "S"
  }

  attribute {
    name = "path"
    type = "S"
  }

  attribute {
    name = "revalidatedAt"
    type = "N"
  }

  global_secondary_index {
    name            = "revalidate"
    hash_key        = "path"
    range_key       = "revalidatedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = var.tags
}
