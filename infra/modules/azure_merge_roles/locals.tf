locals {
  # Keep stable instance keys even when source role names come from resources
  # created in the same apply.
  source_roles_by_index = {
    for index, role_name in var.source_roles : tostring(index) => role_name
  }

  merged_description = "Reason: ${trimspace(var.reason)} | Source roles: ${join(", ", sort(var.source_roles))}"

  # Azure role definitions expose permissions as a list of permission objects,
  # not as one flat permission bag.
  source_permissions = flatten([
    for role_definition in values(data.azurerm_role_definition.source) : role_definition.permissions
  ])

  normalized_source_permissions = [
    for permission in local.source_permissions : {
      actions          = sort(distinct(tolist(try(permission.actions, []))))
      data_actions     = sort(distinct(tolist(try(permission.data_actions, []))))
      not_actions      = sort(distinct(tolist(try(permission.not_actions, []))))
      not_data_actions = sort(distinct(tolist(try(permission.not_data_actions, []))))
    }
  ]

  normalized_additional_actions = sort(distinct([
    for action in var.additional_actions : trimspace(action)
  ]))

  normalized_additional_data_actions = sort(distinct([
    for action in var.additional_data_actions : trimspace(action)
  ]))

  permission_sets = {
    control = {
      allowed_attr = "actions"
      denied_attr  = "not_actions"
      additional   = local.normalized_additional_actions
    }
    data = {
      allowed_attr = "data_actions"
      denied_attr  = "not_data_actions"
      additional   = local.normalized_additional_data_actions
    }
  }

  source_allowed_actions_by_type = {
    for permission_type, config in local.permission_sets : permission_type => sort(distinct(flatten([
      for permission in local.normalized_source_permissions : permission[config.allowed_attr]
    ])))
  }

  additional_allowed_actions_by_type = {
    for permission_type, config in local.permission_sets : permission_type => config.additional
  }

  effective_allowed_actions_by_type = {
    for permission_type, config in local.permission_sets : permission_type => sort(distinct(concat(
      local.source_allowed_actions_by_type[permission_type],
      local.additional_allowed_actions_by_type[permission_type],
    )))
  }

  excluded_actions_by_type = {
    for permission_type, config in local.permission_sets : permission_type => sort(distinct(flatten([
      for permission in local.normalized_source_permissions : permission[config.denied_attr]
    ])))
  }

  all_allowed_actions  = sort(distinct(flatten(values(local.effective_allowed_actions_by_type))))
  all_excluded_actions = sort(distinct(flatten(values(local.excluded_actions_by_type))))

  action_regex_patterns = {
    for action in distinct(concat(local.all_allowed_actions, local.all_excluded_actions)) : lower(action) => "^${replace(replace(lower(action), ".", "[.]"), "*", ".*")}$"
  }

  action_overlap_by_pair = {
    for pair in flatten([
      for excluded_action in local.all_excluded_actions : [
        for allowed_action in local.all_allowed_actions : {
          key = "${lower(excluded_action)}|||${lower(allowed_action)}"
          overlaps = (
            length(regexall(local.action_regex_patterns[lower(allowed_action)], lower(excluded_action))) > 0 ||
            length(regexall(local.action_regex_patterns[lower(excluded_action)], lower(allowed_action))) > 0 ||
            (
              length(regexall("\\*", allowed_action)) > 0 &&
              length(regexall("\\*", excluded_action)) > 0 &&
              (
                startswith(lower(allowed_action), element(split("*", lower(excluded_action)), 0)) ||
                startswith(lower(excluded_action), element(split("*", lower(allowed_action)), 0))
              )
            )
          )
        }
      ]
    ]) : pair.key => pair.overlaps
  }

  source_exclusion_overlap_by_type = {
    for permission_type, config in local.permission_sets : permission_type => {
      for excluded_action in local.excluded_actions_by_type[permission_type] : excluded_action => anytrue([
        for permission in local.normalized_source_permissions : (
          !contains([for denied_action in permission[config.denied_attr] : lower(denied_action)], lower(excluded_action)) &&
          anytrue([
            for allowed_action in permission[config.allowed_attr] : local.action_overlap_by_pair["${lower(excluded_action)}|||${lower(allowed_action)}"]
          ])
        )
      ])
    }
  }

  additional_exclusion_overlap_by_type = {
    for permission_type, config in local.permission_sets : permission_type => {
      for excluded_action in local.excluded_actions_by_type[permission_type] : excluded_action => anytrue([
        for allowed_action in local.additional_allowed_actions_by_type[permission_type] : local.action_overlap_by_pair["${lower(excluded_action)}|||${lower(allowed_action)}"]
      ])
    }
  }

  merged_permissions = {
    actions      = local.effective_allowed_actions_by_type.control
    data_actions = local.effective_allowed_actions_by_type.data

    # Azure custom roles accept a single permissions object. Preserve an
    # exclusion only when no other permission block overlaps it strongly enough
    # to justify the repository's permissive merge policy.
    #
    # The overlap test intentionally treats exact matches, broader grants,
    # narrower grants, and partial wildcard overlaps with the same static
    # prefix as enough evidence that the exclusion should be dropped. A block
    # cannot cancel the exact same exclusion it declares itself.
    not_actions = sort([
      for excluded_action in local.excluded_actions_by_type.control : excluded_action
      if !(
        local.source_exclusion_overlap_by_type.control[excluded_action] ||
        local.additional_exclusion_overlap_by_type.control[excluded_action]
      )
    ])

    # Apply the same permissive overlap policy to data-plane permissions.
    not_data_actions = sort([
      for excluded_action in local.excluded_actions_by_type.data : excluded_action
      if !(
        local.source_exclusion_overlap_by_type.data[excluded_action] ||
        local.additional_exclusion_overlap_by_type.data[excluded_action]
      )
    ])
  }
}
