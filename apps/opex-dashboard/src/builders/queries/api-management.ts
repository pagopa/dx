/**
 * Kusto query templates for API Management resources.
 */

import type { TemplateContext } from "../../core/template/context.schema.js";

import { uriToRegex } from "../../core/template/helpers.js";

interface QueryContext extends TemplateContext {
  endpoint: string;
  is_alarm?: boolean;
  threshold?: number;
}

/**
 * Availability query for API Management.
 * Calculates success rate (status < 500) for endpoint.
 */
export function availabilityQuery(ctx: QueryContext): string {
  const endpoint = ctx.endpoint;
  const basePath = ctx.base_path ?? "";
  const threshold = ctx.threshold ?? 0.99;
  const props = ctx.endpoints?.[endpoint];
  const method = props?.method;
  const path = props?.path ?? endpoint;
  const uriPattern = uriToRegex(basePath + path);
  const timespan = ctx.timespan || "5m";
  const isAlarm = ctx.is_alarm ?? false;
  // NOTE: Threshold inversion logic to match legacy template behavior
  // For thresholds other than the default (0.99), invert to (1 - threshold)
  // This converts availability thresholds to error rate thresholds
  // const displayThreshold =
  //   threshold === 0.99 ? threshold : Math.round((1 - threshold) * 100) / 100;
  const displayThreshold = threshold;

  return `${isAlarm ? "" : "\n"}let threshold = ${displayThreshold};
AzureDiagnostics
| where url_s matches regex "${uriPattern}"${method ? `\n| where method_s == "${method}"` : ""}
| summarize
  Total=count(),
  Success=count(responseCode_d < 500 and responseCode_d != 0) by bin(TimeGenerated, ${timespan})
| extend availability=toreal(Success) / Total
${
  isAlarm
    ? `| where availability < threshold`
    : `| project TimeGenerated, availability, watermark=threshold
| render timechart with (xtitle = "time", ytitle= "availability(%)")`
}
`;
}

/**
 * Response codes query for API Management.
 * Breaks down HTTP status codes by category (1XX, 2XX, etc.).
 */
export function responseCodesQuery(ctx: QueryContext): string {
  const endpoint = ctx.endpoint;
  const basePath = ctx.base_path ?? "";
  const props = ctx.endpoints?.[endpoint];
  const method = props?.method;
  const path = props?.path ?? endpoint;
  const uriPattern = uriToRegex(basePath + path);
  const timespan = ctx.timespan || "5m";

  return `\nlet api_url = "${uriPattern}";
AzureDiagnostics
| where url_s matches regex api_url${method ? `\n| where method_s == "${method}"` : ""}
| extend HTTPStatus = case(
  responseCode_d between (100 .. 199), "1XX",
  responseCode_d between (200 .. 299), "2XX",
  responseCode_d between (300 .. 399), "3XX",
  responseCode_d between (400 .. 499), "4XX",
  "5XX")
| summarize count() by HTTPStatus, bin(TimeGenerated, ${timespan})
| render areachart with (xtitle = "time", ytitle= "count")
`;
}

/**
 * Response time query for API Management.
 * Calculates 95th percentile response time for endpoint.
 */
export function responseTimeQuery(ctx: QueryContext): string {
  const endpoint = ctx.endpoint;
  const basePath = ctx.base_path ?? "";
  const threshold = ctx.threshold ?? 1;
  const props = ctx.endpoints?.[endpoint];
  const method = props?.method;
  const path = props?.path ?? endpoint;
  const uriPattern = uriToRegex(basePath + path);
  const timespan = ctx.timespan || "5m";
  const isAlarm = ctx.is_alarm ?? false;
  const percentile = ctx.queries?.response_time_percentile ?? 95;

  return `${isAlarm ? "" : "\n"}let threshold = ${threshold};
AzureDiagnostics
| where url_s matches regex "${uriPattern}"${method ? `\n| where method_s == "${method}"` : ""}
| summarize
    watermark=threshold,
    duration_percentile_${percentile}=percentiles(todouble(DurationMs)/1000, ${percentile}) by bin(TimeGenerated, ${timespan})
${isAlarm ? `| where duration_percentile_${percentile} > threshold` : `| render timechart with (xtitle = "time", ytitle= "response time(s)")`}
`;
}
