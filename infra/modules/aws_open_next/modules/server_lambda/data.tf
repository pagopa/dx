locals {
  source_files = ["${path.module}/../../dummy_lambda/index.js", "${path.module}/../../dummy_lambda/package.json"]
}

data "archive_file" "lambda_zip" {
  type = "zip"

  source_dir  = "${path.module}/../../dummy_lambda"
  output_path = "${path.module}/../../dummy_lambda/${local.app_prefix}.zip"

  dynamic "source" {
    for_each = local.source_files
    content {
      filename = basename(source.value)
      content  = file(source.value)
    }
  }

}
