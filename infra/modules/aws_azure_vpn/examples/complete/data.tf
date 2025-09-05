# Data sources for dynamic values
data "aws_availability_zones" "available" {
  state = "available"
}
