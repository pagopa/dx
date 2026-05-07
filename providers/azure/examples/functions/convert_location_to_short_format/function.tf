# Converts full region name to short location code
output "location_short_from_long" {
  value = provider::dx::convert_location_to_short_format("italynorth")
}
