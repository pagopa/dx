resource "azurerm_dns_zone" "dx_pagopa_it" {
  name                = "dx.pagopa.it"
  resource_group_name = module.azure.network_resource_group_name

  tags = local.tags
}

resource "azurerm_dns_caa_record" "dx_pagopa_it" {
  name                = "@"
  zone_name           = azurerm_dns_zone.dx_pagopa_it.name
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

### Delegation from dx.pagopa.it to dev.dx.pagopa.it

resource "azurerm_dns_ns_record" "dev_dx_pagopa_it" {
  name                = "dev"
  zone_name           = azurerm_dns_zone.dx_pagopa_it.name
  resource_group_name = module.azure.network_resource_group_name
  records = [
    "ns1-05.azure-dns.com.",
    "ns2-05.azure-dns.net.",
    "ns3-05.azure-dns.org.",
    "ns4-05.azure-dns.info."
  ]
  ttl  = 300
  tags = local.tags
}

### Delegation from dx.pagopa.it to uat.dx.pagopa.it

resource "azurerm_dns_ns_record" "uat_dx_pagopa_it" {
  name                = "uat"
  zone_name           = azurerm_dns_zone.dx_pagopa_it.name
  resource_group_name = module.azure.network_resource_group_name
  records = [
    "ns1-01.azure-dns.com.",
    "ns2-01.azure-dns.net.",
    "ns3-01.azure-dns.org.",
    "ns4-01.azure-dns.info."
  ]
  ttl  = 300
  tags = local.tags
}
