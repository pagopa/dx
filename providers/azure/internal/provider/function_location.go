package provider

import (
	"context"
	"fmt"
	"strings"

	"github.com/hashicorp/terraform-plugin-framework/function"
)

// locationShortToLong maps short location codes to their full Azure region names.
var locationShortToLong = map[string]string{
	"swc": "swedencentral",
	"spc": "spaincentral",
	"gwc": "germanycentral",
	"itn": "italynorth",
	"neu": "northeurope",
	"weu": "westeurope",
}

// locationLongToShort maps full Azure region names to their short codes.
var locationLongToShort = map[string]string{
	"swedencentral":  "swc",
	"spaincentral":   "spc",
	"germanycentral": "gwc",
	"italynorth":     "itn",
	"northeurope":    "neu",
	"westeurope":     "weu",
}

// validShortLocations returns a comma-separated list of valid short location codes.
func validShortLocations() string {
	keys := make([]string, 0, len(locationShortToLong))
	for k := range locationShortToLong {
		keys = append(keys, k)
	}
	return strings.Join(keys, ", ")
}

// validLongLocations returns a comma-separated list of valid long location names.
func validLongLocations() string {
	keys := make([]string, 0, len(locationLongToShort))
	for k := range locationLongToShort {
		keys = append(keys, k)
	}
	return strings.Join(keys, ", ")
}

// --- convert_location_to_long_format ---

var _ function.Function = &convertLocationToLongFormatFunction{}

type convertLocationToLongFormatFunction struct{}

func NewConvertLocationToLongFormatFunction() function.Function {
	return &convertLocationToLongFormatFunction{}
}

func (f *convertLocationToLongFormatFunction) Metadata(_ context.Context, _ function.MetadataRequest, resp *function.MetadataResponse) {
	resp.Name = "convert_location_to_long_format"
}

func (f *convertLocationToLongFormatFunction) Definition(_ context.Context, _ function.DefinitionRequest, resp *function.DefinitionResponse) {
	resp.Definition = function.Definition{
		Summary:     "Convert a short location code to its full Azure region name",
		Description: "Given a short location code (e.g. \"itn\"), returns the corresponding full Azure region name (e.g. \"italynorth\").",
		Parameters: []function.Parameter{
			function.StringParameter{
				Name:        "location_short",
				Description: fmt.Sprintf("Short location code. Valid values: %s.", validShortLocations()),
			},
		},
		Return: function.StringReturn{},
	}
}

func (f *convertLocationToLongFormatFunction) Run(ctx context.Context, req function.RunRequest, resp *function.RunResponse) {
	var locationShort string
	resp.Error = function.ConcatFuncErrors(resp.Error, req.Arguments.Get(ctx, &locationShort))
	if resp.Error != nil {
		return
	}

	normalized := strings.ToLower(strings.TrimSpace(locationShort))
	long, ok := locationShortToLong[normalized]
	if !ok {
		resp.Error = function.NewFuncError(
			fmt.Sprintf("InvalidLocation: \"%s\" is not a valid short location code. Valid values: %s.", locationShort, validShortLocations()),
		)
		return
	}

	resp.Error = function.ConcatFuncErrors(resp.Error, resp.Result.Set(ctx, long))
}

// --- convert_location_to_short_format ---

var _ function.Function = &convertLocationToShortFormatFunction{}

type convertLocationToShortFormatFunction struct{}

func NewConvertLocationToShortFormatFunction() function.Function {
	return &convertLocationToShortFormatFunction{}
}

func (f *convertLocationToShortFormatFunction) Metadata(_ context.Context, _ function.MetadataRequest, resp *function.MetadataResponse) {
	resp.Name = "convert_location_to_short_format"
}

func (f *convertLocationToShortFormatFunction) Definition(_ context.Context, _ function.DefinitionRequest, resp *function.DefinitionResponse) {
	resp.Definition = function.Definition{
		Summary:     "Convert a full Azure region name to its short location code",
		Description: "Given a full Azure region name (e.g. \"italynorth\"), returns the corresponding short location code (e.g. \"itn\").",
		Parameters: []function.Parameter{
			function.StringParameter{
				Name:        "location_long",
				Description: fmt.Sprintf("Full Azure region name. Valid values: %s.", validLongLocations()),
			},
		},
		Return: function.StringReturn{},
	}
}

func (f *convertLocationToShortFormatFunction) Run(ctx context.Context, req function.RunRequest, resp *function.RunResponse) {
	var locationLong string
	resp.Error = function.ConcatFuncErrors(resp.Error, req.Arguments.Get(ctx, &locationLong))
	if resp.Error != nil {
		return
	}

	normalized := strings.ToLower(strings.TrimSpace(locationLong))
	short, ok := locationLongToShort[normalized]
	if !ok {
		resp.Error = function.NewFuncError(
			fmt.Sprintf("InvalidLocation: \"%s\" is not a valid long location name. Valid values: %s.", locationLong, validLongLocations()),
		)
		return
	}

	resp.Error = function.ConcatFuncErrors(resp.Error, resp.Result.Set(ctx, short))
}
