output "prefixes" {
  value = length(var.environments) > 1 ? keys(local.configurations) : null
}

output "suffixes" {
  value = length(var.environments) > 1 ? {
    for env_name, env in local.configurations : env_name => {
      for i, suffix in local.configurations[env_name].app_suffix : tostring(i + 1) => suffix
    }
  } : null
}

output "projects" {
  value = length(var.environments) > 1 ? {
    for env_name, env in local.configurations : env_name => local.configurations[env_name].project
  } : null
}

output "names" {
  value = length(var.environments) > 1 ? {
    for env_name, env in local.configurations : env_name => tomap({
      for resource_type, abbreviation in local.resource_abbreviations :
      resource_type => {
        for i, suffix in env.app_suffix :
        tostring(i + 1) => (
          strcontains(resource_type, "storage_account") ?
          replace("${env_name}${abbreviation}${suffix}", "-", "") :
          "${env_name}-${abbreviation}-${suffix}"
        )
      }
    })
  } : null
}

# If there is only one environment

output "prefix" {
  value = length(var.environments) == 1 ? keys(local.configurations)[0] : null
}

output "suffix" {
  value = length(var.environments) == 1 ? { for i, suffix in local.configurations[keys(local.configurations)[0]].app_suffix : tostring(i + 1) => suffix } : null
}

output "project" {
  value = length(var.environments) == 1 ? local.configurations[keys(local.configurations)[0]].project : null
}

output "name" {
  value = length(var.environments) == 1 ? tomap({
    for resource_type, abbreviation in local.resource_abbreviations :
    resource_type => {
      for i, suffix in local.configurations[keys(local.configurations)[0]].app_suffix :
      tostring(i + 1) => (
        strcontains(resource_type, "storage_account") ?
        replace("${keys(local.configurations)[0]}${abbreviation}${suffix}", "-", "") :
        "${keys(local.configurations)[0]}-${abbreviation}-${suffix}"
      )
    }
  }) : null
}