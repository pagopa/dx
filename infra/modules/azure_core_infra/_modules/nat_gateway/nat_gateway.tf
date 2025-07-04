resource "azurerm_public_ip_prefix" "ng" {
  count = var.ng_number

  name                = format("%s-ippre-%02d", "${var.project}-ng", count.index + 1)
  location            = var.location
  resource_group_name = var.resource_group_name

  prefix_length = 31
  zones         = [count.index + 1]

  tags = var.tags
}

resource "azurerm_nat_gateway" "this" {
  count = var.ng_number

  name                    = "${var.project}-ng-0${count.index + 1}"
  location                = var.location
  resource_group_name     = var.resource_group_name
  sku_name                = "Standard"
  idle_timeout_in_minutes = 4
  zones                   = [count.index + 1]

  tags = var.tags
}

resource "azurerm_nat_gateway_public_ip_prefix_association" "this_ippres" {
  count               = var.ng_number
  nat_gateway_id      = azurerm_nat_gateway.this[count.index].id
  public_ip_prefix_id = azurerm_public_ip_prefix.ng[count.index].id
}
