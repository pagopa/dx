locals {
  # Keep stable instance keys even when source role names come from resources
  # created in the same apply.
  source_roles_by_index = {
    for index, role_name in var.source_roles : tostring(index) => role_name
  }

  # Azure custom roles reject legacy Microsoft.Classic* provider operations
  # even when they still appear inside some built-in role definitions.
  unsupported_action_provider_prefixes = ["microsoft.classic"]

  merged_description = "Reason: ${trimspace(var.reason)} | Source roles: ${join(", ", sort(var.source_roles))}"

  # Azure role definitions expose permissions as a list of permission objects,
  # not as one flat permission bag.
  source_permissions = flatten([
    for role_definition in values(data.azurerm_role_definition.source) : role_definition.permissions
  ])

  # Normalize every source permission list once so the merge logic can work on
  # deduplicated values and does not need to repeat legacy-provider filtering.
  normalized_source_permissions = [
    for permission in local.source_permissions : {
      actions = sort(distinct([
        for action in tolist(try(permission.actions, [])) : action
        if !anytrue([
          for prefix in local.unsupported_action_provider_prefixes : startswith(lower(action), prefix)
        ])
      ]))
      data_actions = sort(distinct([
        for action in tolist(try(permission.data_actions, [])) : action
        if !anytrue([
          for prefix in local.unsupported_action_provider_prefixes : startswith(lower(action), prefix)
        ])
      ]))
      not_actions = sort(distinct([
        for action in tolist(try(permission.not_actions, [])) : action
        if !anytrue([
          for prefix in local.unsupported_action_provider_prefixes : startswith(lower(action), prefix)
        ])
      ]))
      not_data_actions = sort(distinct([
        for action in tolist(try(permission.not_data_actions, [])) : action
        if !anytrue([
          for prefix in local.unsupported_action_provider_prefixes : startswith(lower(action), prefix)
        ])
      ]))
    }
  ]

  # Additional grants follow the same normalization path as source permissions
  # so overlap checks compare trimmed, stable values.
  normalized_additional_actions = sort(distinct([
    for action in var.additional_actions : trimspace(action)
  ]))

  normalized_additional_data_actions = sort(distinct([
    for action in var.additional_data_actions : trimspace(action)
  ]))

  merged_permissions = {
    # The final allowed permission sets are the union of all source roles plus
    # any caller-provided additions.
    actions = sort(distinct(concat(
      flatten([
        for permission in local.normalized_source_permissions : permission.actions
      ]),
      local.normalized_additional_actions,
    )))

    data_actions = sort(distinct(concat(
      flatten([
        for permission in local.normalized_source_permissions : permission.data_actions
      ]),
      local.normalized_additional_data_actions,
    )))

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
      if !(
        anytrue([
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
        ]) ||
        # Additional actions must also participate in overlap detection,
        # otherwise an explicit extra grant could remain blocked by a kept
        # exclusion from a source role.
        anytrue([
          for allowed_action in local.normalized_additional_actions : (
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

    # Apply the same permissive overlap policy to data-plane permissions.
    not_data_actions = sort([
      for excluded_action in distinct(flatten([
        for permission in local.normalized_source_permissions : permission.not_data_actions
      ])) : excluded_action
      if !(
        anytrue([
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
        ]) ||
        # Apply the same rule to additional data-plane grants so explicit blob,
        # queue, or table permissions can override overlapping exclusions.
        anytrue([
          for allowed_action in local.normalized_additional_data_actions : (
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
  }
}
