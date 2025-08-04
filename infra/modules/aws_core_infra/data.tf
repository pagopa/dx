# Availability zones for the region
data "aws_availability_zones" "available" {
  state = "available"
}
