package provider

import (
	"github.com/hashicorp/terraform-plugin-framework/providerserver"
	"github.com/hashicorp/terraform-plugin-go/tfprotov6"
)

const (
	providerConfig = `
provider "dx" {
  prefix 			= "dx"
  environment = "d"
	domain 			= "test"
  location  	= "itn"
}
`
)

var (
	testAccProtoV6ProviderFactories = map[string]func() (tfprotov6.ProviderServer, error){
		"dx": providerserver.NewProtocol6WithError(New("test")()),
	}
)
