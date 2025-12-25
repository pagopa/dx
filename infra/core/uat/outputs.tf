output "values" {
  value = merge(module.azure, module.aws)
}
