locals {
  source_files = ["${path.module}/../../dummy_lambda/index.js", "${path.module}/../../dummy_lambda/package.json"]
}

data "template_file" "t_file" {
  count    = length(local.source_files)
  template = file(element(local.source_files, count.index))
}


data "archive_file" "lambda_zip" {
  type = "zip"

  source_dir  = "${path.module}/../../dummy_lambda"
  output_path = "${path.module}/../../dummy_lambda/${local.app_prefix}.zip"

  source {
    filename = basename(local.source_files[0])
    content  = data.template_file.t_file[0].rendered
  }

  source {
    filename = basename(local.source_files[1])
    content  = data.template_file.t_file[1].rendered
  }

}
