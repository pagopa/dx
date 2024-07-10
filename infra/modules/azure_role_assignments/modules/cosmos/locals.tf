locals {
  role_definition_id = {
    reader = "00000000-0000-0000-0000-000000000001"
    writer = "00000000-0000-0000-0000-000000000002"
  }

  assignments = {
    for assignment in flatten([
      for entry in var.cosmos : [
        for collection in entry.collections : {
          account_name        = entry.account_name
          resource_group_name = entry.resource_group_name
          role                = entry.role
          database            = entry.database
          collection          = collection
          scope               = collection == "*" ? (entry.database == "*" ? "/" : "/dbs/${entry.database}") : "/dbs/${entry.database}/colls/${collection}"
        }
      ]
    ]) : "${assignment.account_name}|${assignment.database}|${assignment.collection}|${assignment.role}" => assignment
  }

  accounts = distinct([for assignment in var.cosmos : { account_name = assignment.account_name, resource_group_name = assignment.resource_group_name }])
}