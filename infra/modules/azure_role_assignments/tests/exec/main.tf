terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
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
    command = <<EOT
      rm -f ${path.module}/result.txt

      # KEY VAULT CHECK
      sleep 10000
      if [[ "${var.resource}" == "key_vault" ]]; then
        if [[ "${var.type}" == "rbac" ]]; then
          role_assignments=$(az role assignment list --assignee ${var.principal_id})
          if [[ "$role_assignments" == "[]" ]]; then
            echo "false" > ${path.module}/result.txt
          else
            echo "true" > ${path.module}/result.txt
          fi
        elif [[ "${var.type}" == "policy" ]]; then
          access_policy=$(az keyvault show --name dx-d-kv-common-01 --query "properties.accessPolicies" | grep ${var.principal_id})
          if [[ -z "$access_policy" ]]; then
            echo "false" > ${path.module}/result.txt
          else
            echo "true" > ${path.module}/result.txt
          fi
        fi
      fi
    EOT
  }
}

data "local_file" "role_assignments" {
  filename = "${path.module}/result.txt"

  depends_on = [null_resource.get_role_assignments]
}

output "role_assignments" {
  value = tobool(trimspace(data.local_file.role_assignments.content))
}
