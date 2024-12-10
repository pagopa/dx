output "prefix" {
  value = keys(local.configurations)
}

output "suffix" {
  value = { for env_name, env in local.configurations : env_name => { for suffix in local.configurations[env_name].app_suffix : suffix => suffix } }
}

output "project" {
  value = { for env_name, env in local.configurations : env_name => local.configurations[env_name].project }
}

output "names" {
  value = {
    for env_name, env in local.configurations : env_name => tomap({
      for resource_type, abbreviation in local.resource_abbreviations :
      resource_type => {
        for i, suffix in env.app_suffix :
        suffix => (
          strcontains(resource_type, "storage_account") ?
          replace("${env_name}${abbreviation}${suffix}", "-", "") :
          "${env_name}-${abbreviation}-${suffix}"
        )
      }
    })
  }
}