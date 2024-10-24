terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.116.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "3.2.3"
    }
    local = {
      source  = "hashicorp/local"
      version = "2.5.2"
    }
  }
}

resource "null_resource" "get_role_assignments" {
  provisioner "local-exec" {
    command = "az role assignment list --assignee ${var.principal_id} > ${path.module}/role_assignments.json"
  }
}

data "local_file" "role_assignments_json" {
  filename = "${path.module}/role_assignments.json"

  depends_on = [null_resource.get_role_assignments]
}

resource "null_resource" "rm_role_assignments" {
  provisioner "local-exec" {
    command = "rm ${path.module}/role_assignments.json"
  }
  depends_on = [data.local_file.role_assignments_json]
}

output "role_assignments" {
  value = jsondecode(data.local_file.role_assignments_json.content)
}