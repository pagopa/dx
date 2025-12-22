/**
 * Kusto query templates for App Gateway resources.
 */

import type { TemplateContext } from "../../core/template/context.schema.js";

import { uriToRegex } from "../../core/template/helpers.js";

interface QueryContext extends TemplateContext {
  endpoint: string;
  isAlarm?: boolean;
  threshold?: number;
}

/**
 * Availability query for App Gateway.
 * Calculates success rate (status < 500) for endpoint.
 */
export function availabilityQuery(ctx: QueryContext): string {
  const endpoint = ctx.endpoint;
  const basePath = ctx.basePath ?? "";
  const threshold = ctx.threshold ?? 0.99;
  const props = ctx.endpoints?.[endpoint];
  const method = props?.method;
  const path = props?.path ?? endpoint;
  const uriPattern = uriToRegex(basePath + path);
  const hostsJson = JSON.stringify(ctx.hosts ?? []).replace(/,/g, ", ");
  const timespan = ctx.timespan || "5m";
  const isAlarm = ctx.isAlarm ?? false;
  // NOTE: Threshold inversion logic to match legacy template behavior
  // For thresholds other than the default (0.99), invert to (1 - threshold)
  // This converts availability thresholds to error rate thresholds
  // const displayThreshold =
  //   threshold === 0.99 ? threshold : Math.round((1 - threshold) * 100) / 100;
  const displayThreshold = threshold;

  return `${isAlarm ? "" : "\n"}let api_hosts = datatable (name: string) ${hostsJson};
let threshold = ${displayThreshold};
AzureDiagnostics
| where originalHost_s in (api_hosts)
| where requestUri_s matches regex "${uriPattern}"${method ? `\n| where httpMethod_s == "${method}"` : ""}
| summarize
  Total=count(),
  Success=count(httpStatus_d < 500) by bin(TimeGenerated, ${timespan})
| extend availability=toreal(Success) / Total
${
  isAlarm
    ? "| where availability < threshold"
    : `| project TimeGenerated, availability, watermark=threshold
| render timechart with (xtitle = "time", ytitle= "availability(%)")`
}
`;
}

/**
 * Response codes query for App Gateway.
 * Breaks down HTTP status codes by category (1XX, 2XX, etc.).
 */
export function responseCodesQuery(ctx: QueryContext): string {
  const endpoint = ctx.endpoint;
  const basePath = ctx.basePath ?? "";
  const props = ctx.endpoints?.[endpoint];
  const method = props?.method;
  const path = props?.path ?? endpoint;
  const uriPattern = uriToRegex(basePath + path);
  const hostsJson = JSON.stringify(ctx.hosts ?? []).replace(/,/g, ", ");
  const timespan = ctx.timespan || "5m";

  return `\nlet api_url = "${uriPattern}";
let api_hosts = datatable (name: string) ${hostsJson};
AzureDiagnostics
| where originalHost_s in (api_hosts)
| where requestUri_s matches regex api_url${method ? `\n| where httpMethod_s == "${method}"` : ""}
| extend HTTPStatus = case(
  httpStatus_d between (100 .. 199), "1XX",
  httpStatus_d between (200 .. 299), "2XX",
  httpStatus_d between (300 .. 399), "3XX",
  httpStatus_d between (400 .. 499), "4XX",
  "5XX")
| summarize count() by HTTPStatus, bin(TimeGenerated, ${timespan})
| render areachart with (xtitle = "time", ytitle= "count")
`;
}

/**
 * Response time query for App Gateway.
 * Calculates 95th percentile response time for endpoint.
 */
export function responseTimeQuery(ctx: QueryContext): string {
  const endpoint = ctx.endpoint;
  const basePath = ctx.basePath ?? "";
  const threshold = ctx.threshold ?? 1;
  const props = ctx.endpoints?.[endpoint];
  const method = props?.method;
  const path = props?.path ?? endpoint;
  const uriPattern = uriToRegex(basePath + path);
  const hostsJson = JSON.stringify(ctx.hosts ?? []).replace(/,/g, ", ");
  const timespan = ctx.timespan || "5m";
  const isAlarm = ctx.isAlarm ?? false;
  const percentile = ctx.queries?.responseTimePercentile ?? 95;

  return `${isAlarm ? "" : "\n"}let api_hosts = datatable (name: string) ${hostsJson};
let threshold = ${threshold};
AzureDiagnostics
| where originalHost_s in (api_hosts)
| where requestUri_s matches regex "${uriPattern}"${method ? `\n| where httpMethod_s == "${method}"` : ""}
| summarize
    watermark=threshold,
    duration_percentile_${percentile}=percentiles(timeTaken_d, ${percentile}) by bin(TimeGenerated, ${timespan})
${isAlarm ? `| where duration_percentile_${percentile} > threshold` : `| render timechart with (xtitle = "time", ytitle= "response time(s)")`}
`;
}
