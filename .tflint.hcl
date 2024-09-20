config {
  format = "default"
  call_module_type = "local"
  force = false
  disabled_by_default = false
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}