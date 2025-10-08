### dev.dx.pagopa.it

resource "azurerm_dns_zone" "dev_dx_pagopa_it" {
  name                = "dev.dx.pagopa.it"
  resource_group_name = module.azure.network_resource_group_name

  tags = local.tags
}

resource "azurerm_dns_caa_record" "dev_dx_pagopa_it" {
  name                = "@"
  zone_name           = azurerm_dns_zone.dev_dx_pagopa_it.name
  resource_group_name = module.azure.network_resource_group_name
  ttl                 = 300

  record {
    flags = 0
    tag   = "issue"
    value = "digicert.com"
  }

  record {
    flags = 0
    tag   = "issue"
    value = "letsencrypt.org"
  }

  record {
    flags = 0
    tag   = "iodef"
    value = "mailto:security+caa@pagopa.it"
  }

  record {
    flags = 0
    tag   = "issue"
    value = "amazon.com"
  }

  record {
    flags = 0
    tag   = "issue"
    value = "amazontrust.com"
  }

  record {
    flags = 0
    tag   = "issue"
    value = "awstrust.com"
  }

  record {
    flags = 0
    tag   = "issue"
    value = "amazonaws.com"
  }

  tags = local.tags
}
