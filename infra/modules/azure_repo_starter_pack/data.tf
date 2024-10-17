data "azuread_group" "admins" {
  display_name = var.entraid_groups.admins
}

data "azuread_group" "devs" {
  display_name = var.entraid_groups.devs
}

data "azuread_group" "externals" {
  count = var.entraid_groups.externals == null ? 0 : 1

  display_name = var.entraid_groups.externals
}
