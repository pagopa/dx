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

  merged_permissions = {
    actions = sort(distinct(flatten([
      for permission in local.normalized_source_permissions : permission.actions
    ])))

    data_actions = sort(distinct(flatten([
      for permission in local.normalized_source_permissions : permission.data_actions
    ])))

    # Azure custom roles accept a single permissions object. Preserve an
    # exclusion only when no other permission block overlaps it strongly enough
    # to justify the repository's permissive merge policy.
    #
    # The overlap test intentionally treats exact matches, broader grants,
    # narrower grants, and partial wildcard overlaps with the same static
    # prefix as enough evidence that the exclusion should be dropped. A block
    # cannot cancel the exact same exclusion it declares itself.
    not_actions = sort([
      for excluded_action in distinct(flatten([
        for permission in local.normalized_source_permissions : permission.not_actions
      ])) : excluded_action
      if !anytrue([
        for permission in local.normalized_source_permissions : (
          !contains([for denied_action in permission.not_actions : lower(denied_action)], lower(excluded_action)) &&
          anytrue([
            for allowed_action in permission.actions : (
              length(regexall("^${replace(replace(lower(allowed_action), ".", "[.]"), "*", ".*")}$", lower(excluded_action))) > 0 ||
              length(regexall("^${replace(replace(lower(excluded_action), ".", "[.]"), "*", ".*")}$", lower(allowed_action))) > 0 ||
              (
                length(regexall("\\*", allowed_action)) > 0 &&
                length(regexall("\\*", excluded_action)) > 0 &&
                (
                  startswith(lower(allowed_action), element(split("*", lower(excluded_action)), 0)) ||
                  startswith(lower(excluded_action), element(split("*", lower(allowed_action)), 0))
                )
              )
            )
          ])
        )
      ])
    ])

    # Apply the same permissive overlap policy to data-plane permissions.
    not_data_actions = sort([
      for excluded_action in distinct(flatten([
        for permission in local.normalized_source_permissions : permission.not_data_actions
      ])) : excluded_action
      if !anytrue([
        for permission in local.normalized_source_permissions : (
          !contains([for denied_action in permission.not_data_actions : lower(denied_action)], lower(excluded_action)) &&
          anytrue([
            for allowed_action in permission.data_actions : (
              length(regexall("^${replace(replace(lower(allowed_action), ".", "[.]"), "*", ".*")}$", lower(excluded_action))) > 0 ||
              length(regexall("^${replace(replace(lower(excluded_action), ".", "[.]"), "*", ".*")}$", lower(allowed_action))) > 0 ||
              (
                length(regexall("\\*", allowed_action)) > 0 &&
                length(regexall("\\*", excluded_action)) > 0 &&
                (
                  startswith(lower(allowed_action), element(split("*", lower(excluded_action)), 0)) ||
                  startswith(lower(excluded_action), element(split("*", lower(allowed_action)), 0))
                )
              )
            )
          ])
        )
      ])
    ])
  }
}
