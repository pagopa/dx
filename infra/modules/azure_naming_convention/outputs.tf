output "prefix" {
  value = local.app_prefix
}

output "suffix" {
  value = local.app_suffix
}

output "project" {
  value = local.project
}

output "domain" {
  value = local.domain
}

output "names" {
  value = tomap({
    for resource_type, abbreviation in local.resource_abbreviations :
    resource_type => (
      strcontains(resource_type, "storage_account") ?
      replace("${local.app_prefix}${abbreviation}${local.app_suffix}", "-", "") :
      "${local.app_prefix}-${abbreviation}-${local.app_suffix}"
    )
  })
}