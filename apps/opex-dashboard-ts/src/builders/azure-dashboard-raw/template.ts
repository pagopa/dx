/**
 * Azure Dashboard Raw JSON template.
 */

/* eslint-disable perfectionist/sort-objects, perfectionist/sort-modules */

import type { TemplateContext } from "../../core/template/context.schema.js";

import { parseEndpointKey } from "../../utils/index.js";
import * as queries from "../queries/index.js";

/**
 * Create common metadata inputs structure.
 */
function createMetadataInputs(
  resourceIds: string[],
  queryValue: string,
  partTitle: string,
  partSubTitle: string,
  specificChart: string,
  dimensions: Record<string, unknown>,
) {
  return [
    { name: "resourceTypeMode", isOptional: true },
    { name: "ComponentId", isOptional: true },
    { name: "Scope", value: { resourceIds }, isOptional: true },
    { name: "PartId", isOptional: true },
    { name: "Version", value: "2.0", isOptional: true },
    { name: "TimeRange", value: "PT4H", isOptional: true },
    { name: "DashboardId", isOptional: true },
    {
      name: "DraftRequestParameters",
      value: { scope: "hierarchy" },
      isOptional: true,
    },
    { name: "Query", value: queryValue, isOptional: true },
    { name: "ControlType", value: "FrameControlChart", isOptional: true },
    { name: "SpecificChart", value: specificChart, isOptional: true },
    { name: "PartTitle", value: partTitle, isOptional: true },
    { name: "PartSubTitle", value: partSubTitle, isOptional: true },
    { name: "Dimensions", value: dimensions, isOptional: true },
    {
      name: "LegendOptions",
      value: { isEnabled: true, position: "Bottom" },
      isOptional: true,
    },
    { name: "IsQueryContainTimeRange", value: false, isOptional: true },
  ];
}

/**
 * Create availability part for an endpoint.
 */
function createAvailabilityPart(
  ctx: TemplateContext,
  endpoint: string,
  props: Record<string, unknown>,
  resourceIds: string[],
  timespan: string,
  fullPath: string,
  partIndex: number,
  yPosition: number,
  queryFns: typeof queries.apiManagement | typeof queries.appGateway,
) {
  const availabilityQuery = queryFns.availabilityQuery({
    ...ctx,
    endpoint,
    is_alarm: false,
    threshold: props.availability_threshold as number | undefined,
    ...props, // Include method and path from queryProps
  });

  return {
    [`${partIndex}`]: {
      position: { x: 0, y: yPosition, colSpan: 6, rowSpan: 4 },
      metadata: {
        inputs: createMetadataInputs(
          resourceIds,
          availabilityQuery,
          `Availability (${timespan})`,
          fullPath,
          "Line",
          {
            xAxis: { name: "TimeGenerated", type: "datetime" },
            yAxis: [
              { name: "availability", type: "real" },
              { name: "watermark", type: "real" },
            ],
            splitBy: [],
            aggregation: "Sum",
          },
        ),
        type: "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart",
        settings: {
          content: {
            Query: availabilityQuery,
            PartTitle: `Availability (${timespan})`,
          },
        },
      },
    },
  };
}

/**
 * Create response codes part for an endpoint.
 */
function createResponseCodesPart(
  ctx: TemplateContext,
  endpoint: string,
  queryProps: Record<string, unknown>,
  resourceIds: string[],
  timespan: string,
  fullPath: string,
  partIndex: number,
  yPosition: number,
  queryFns: typeof queries.apiManagement | typeof queries.appGateway,
) {
  const responseCodesQuery = queryFns.responseCodesQuery({
    ...ctx,
    endpoint,
    ...queryProps, // Include method and path
  });

  return {
    [`${partIndex}`]: {
      position: { x: 6, y: yPosition, colSpan: 6, rowSpan: 4 },
      metadata: {
        inputs: createMetadataInputs(
          resourceIds,
          responseCodesQuery,
          `Response Codes (${timespan})`,
          fullPath,
          "Pie",
          {
            xAxis: { name: "httpStatus_d", type: "string" },
            yAxis: [{ name: "count_", type: "long" }],
            splitBy: [],
            aggregation: "Sum",
          },
        ),
        type: "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart",
        settings: {
          content: {
            Query: responseCodesQuery,
            SpecificChart: "StackedArea",
            PartTitle: `Response Codes (${timespan})`,
            Dimensions: {
              xAxis: { name: "TimeGenerated", type: "datetime" },
              yAxis: [{ name: "count_", type: "long" }],
              splitBy: [{ name: "HTTPStatus", type: "string" }],
              aggregation: "Sum",
            },
          },
        },
      },
    },
  };
}

/**
 * Create response time part for an endpoint.
 */
function createResponseTimePart(
  ctx: TemplateContext,
  endpoint: string,
  props: Record<string, unknown>,
  resourceIds: string[],
  timespan: string,
  fullPath: string,
  partIndex: number,
  yPosition: number,
  queryFns: typeof queries.apiManagement | typeof queries.appGateway,
) {
  const responseTimeQuery = queryFns.responseTimeQuery({
    ...ctx,
    endpoint,
    is_alarm: false,
    threshold: props.response_time_threshold as number | undefined,
    ...props, // Include method and path from queryProps
  });

  return {
    [`${partIndex}`]: {
      position: { x: 12, y: yPosition, colSpan: 6, rowSpan: 4 },
      metadata: {
        inputs: createMetadataInputs(
          resourceIds,
          responseTimeQuery,
          `Percentile Response Time (${timespan})`,
          fullPath,
          "StackedColumn",
          {
            xAxis: { name: "TimeGenerated", type: "datetime" },
            yAxis: [{ name: "duration_percentile_95", type: "real" }],
            splitBy: [],
            aggregation: "Sum",
          },
        ),
        type: "Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart",
        settings: {
          content: {
            Query: responseTimeQuery,
            SpecificChart: "Line",
            PartTitle: `Percentile Response Time (${timespan})`,
            Dimensions: {
              xAxis: { name: "TimeGenerated", type: "datetime" },
              yAxis: [
                { name: "watermark", type: "long" },
                { name: "duration_percentile_95", type: "real" },
              ],
              splitBy: [],
              aggregation: "Sum",
            },
          },
        },
      },
    },
  };
}

/**
 * Generate Azure Portal Dashboard JSON.
 * Uses structured objects and JSON.stringify to avoid manual comma handling.
 */
export function azureDashboardRawTemplate(
  ctx: Record<string, unknown>,
): string {
  const context = ctx as TemplateContext;
  const basePath = context.base_path ?? "";
  const resourceIds = [context.data_source_id];
  const timespan = context.timespan || "5m";

  // Determine which query functions to use based on resource type
  const queryFns =
    context.resource_type === "api-management"
      ? queries.apiManagement
      : queries.appGateway;

  // Generate parts for each endpoint (3 parts per endpoint)
  const endpointEntries = Object.entries(context.endpoints);
  const parts = endpointEntries.flatMap(([endpoint, props], i) => {
    // endpoint format: "METHOD /path" or "/path" (backward compatible)
    const parsed = parseEndpointKey(endpoint);

    const fullPath = basePath + endpoint;

    // Pass method and path to query functions
    // method and path will be undefined if not specified (backward compatible)
    const queryProps = {
      ...props,
      method: parsed.method || props.method,
      path: parsed.path || props.path || endpoint,
    };

    const partIndex = i * 3;
    const yPosition = i * 4;

    return [
      createAvailabilityPart(
        context,
        endpoint,
        queryProps,
        resourceIds,
        timespan,
        fullPath,
        partIndex + 0,
        yPosition,
        queryFns,
      ),
      createResponseCodesPart(
        context,
        endpoint,
        queryProps,
        resourceIds,
        timespan,
        fullPath,
        partIndex + 1,
        yPosition,
        queryFns,
      ),
      createResponseTimePart(
        context,
        endpoint,
        queryProps,
        resourceIds,
        timespan,
        fullPath,
        partIndex + 2,
        yPosition,
        queryFns,
      ),
    ];
  });

  // Merge all parts into a single object
  const mergedParts = Object.assign({}, ...parts);

  // Generate filteredPartIds for the first 9 parts (3 endpoints × 3 parts each)
  // These are referenced in the time range filter
  const filteredPartIds: string[] = [];
  const baseUuid = "9badbd78-7607-4131-8fa1-8b85191432";
  let hexCounter = 0xed; // Starting hex value (237 in decimal)
  const maxFilteredParts = 9; // Always include first 9 part IDs

  for (let i = 0; i < maxFilteredParts; i++) {
    filteredPartIds.push(
      `StartboardPart-LogsDashboardPart-${baseUuid}${hexCounter.toString(16)}`,
    );
    hexCounter += 2; // Increment by 2 for each part
  }

  // Build complete dashboard structure
  const dashboard = {
    properties: {
      lenses: {
        "0": {
          order: 0,
          parts: mergedParts,
        },
      },
      metadata: {
        model: {
          timeRange: {
            value: {
              relative: {
                duration: 24,
                timeUnit: 1,
              },
            },
            type: "MsPortalFx.Composition.Configuration.ValueTypes.TimeRange",
          },
          filterLocale: {
            value: "en-us",
          },
          filters: {
            value: {
              MsPortalFx_TimeRange: {
                model: {
                  format: "local",
                  granularity: "auto",
                  relative: "48h",
                },
                displayCache: {
                  name: "Local Time",
                  value: "Past 48 hours",
                },
                filteredPartIds,
              },
            },
          },
        },
      },
    },
    name: context.name,
    type: "Microsoft.Portal/dashboards",
    location: context.location,
    tags: {
      "hidden-title": context.name,
    },
    apiVersion: "2015-08-01-preview",
  };

  return JSON.stringify(dashboard, null, 2);
}
