/**
 * OA3 endpoints extractor.
 * Extracts hosts and endpoint paths from OpenAPI 2 and 3 specifications.
 * Handles both OA2 (host/basePath) and OA3 (servers) formats.
 */

import * as path from "path";

import type { EndpointConfig, OA3Server, OA3Spec } from "./builder.schema.js";

import {
  DEFAULT_AVAILABILITY_THRESHOLD,
  DEFAULT_RESPONSE_TIME_THRESHOLD,
} from "../../constants/index.js";
import { ConfigError } from "../../core/errors/index.js";

/** Valid HTTP methods for endpoint generation */
const VALID_HTTP_METHODS = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);

interface ExtractedEndpoints {
  endpoints: Record<string, EndpointConfig>;
  hosts: string[];
}

/**
 * Extract hosts and endpoints from OA3 spec.
 * Preserves the original order of endpoints as they appear in the OpenAPI spec.
 */
export function extractEndpoints(
  oa3Spec: OA3Spec,
  evaluationFrequency: number,
  evaluationTimeWindow: number,
  eventOccurrences: number,
  availabilityThreshold?: number,
  responseTimeThreshold?: number,
): ExtractedEndpoints {
  const hosts: string[] = [];
  const endpoints: Record<string, EndpointConfig> = {};

  // Default endpoint configuration
  const endpointDefaults: EndpointConfig = {
    availability_evaluation_frequency: evaluationFrequency,
    availability_evaluation_time_window: evaluationTimeWindow,
    availability_event_occurrences: eventOccurrences,
    availability_threshold:
      availabilityThreshold ?? DEFAULT_AVAILABILITY_THRESHOLD,
    response_time_evaluation_frequency: evaluationFrequency,
    response_time_evaluation_time_window: evaluationTimeWindow,
    response_time_event_occurrences: eventOccurrences,
    response_time_threshold:
      responseTimeThreshold ?? DEFAULT_RESPONSE_TIME_THRESHOLD,
  };

  // Extract hosts from OA3 (servers) or OA2 (host/basePath)
  let serverUrls: string[];
  if (oa3Spec.servers && oa3Spec.servers.length > 0) {
    // OA3 format
    serverUrls = oa3Spec.servers.map((s: OA3Server) => s.url);
  } else if (oa3Spec.host) {
    // OA2 format
    const basePath = oa3Spec.basePath || "";
    serverUrls = [`${oa3Spec.host}${basePath}`];
  } else {
    throw new ConfigError(
      'OpenAPI spec must have either "servers" (OA3) or "host" (OA2) defined',
    );
  }

  // Validate paths exist
  if (!oa3Spec.paths || Object.keys(oa3Spec.paths).length === 0) {
    throw new ConfigError(
      "OpenAPI spec has no paths defined. Cannot generate dashboard for empty specification.",
    );
  }

  // Extract hosts and build endpoints
  const endpointPaths = Object.keys(oa3Spec.paths);

  // Keep track of insertion order by storing normalized paths in array
  const orderedPaths: string[] = [];

  for (const serverUrl of serverUrls) {
    const parsedUrl = new URL(
      serverUrl.startsWith("http") ? serverUrl : `https://${serverUrl}`,
    );
    const host = parseHost(serverUrl);
    hosts.push(host);

    for (const endpointPath of endpointPaths) {
      const normalizedPath = normalizePath(parsedUrl.pathname, endpointPath);
      const pathItem = oa3Spec.paths[endpointPath];

      // Check if any valid HTTP methods exist for this path
      const hasValidMethods =
        pathItem &&
        typeof pathItem === "object" &&
        Object.keys(pathItem).some((method) =>
          VALID_HTTP_METHODS.has(method.toLowerCase()),
        );

      if (hasValidMethods && !endpoints[normalizedPath]) {
        // Use path as key (without method prefix for backward compatibility)
        endpoints[normalizedPath] = {
          ...endpointDefaults,
        };
        orderedPaths.push(normalizedPath);
      }
    }
  }

  // Reconstruct endpoints in original insertion order
  const orderedEndpoints: Record<string, EndpointConfig> = {};
  for (const path of orderedPaths) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    orderedEndpoints[path] = endpoints[path]!;
  }

  // Return endpoints in the original order from the OpenAPI spec
  return { endpoints: orderedEndpoints, hosts };
}

/**
 * Normalize path by removing duplicate slashes and ensuring it starts with /.
 * Fixes bug from Python version where paths could have //.
 */
function normalizePath(urlPath: string, endpointPath: string): string {
  // Remove leading slash from endpoint path for joining
  const cleanEndpointPath = endpointPath.startsWith("/")
    ? endpointPath.slice(1)
    : endpointPath;

  // Join paths and normalize to remove duplicate slashes
  const combined = path.posix.join(urlPath || "/", cleanEndpointPath);

  // Ensure it starts with /
  return combined.startsWith("/") ? combined : `/${combined}`;
}

/**
 * Parse URL to extract netloc (hostname).
 */
function parseHost(hostUrl: string): string {
  try {
    // Ensure URL has a protocol for proper parsing
    const urlString = hostUrl.startsWith("http") ? hostUrl : `//${hostUrl}`;
    const url = new URL(urlString);
    return url.host; // host includes hostname and port
  } catch {
    // Fallback for malformed URLs
    return hostUrl.replace(/^\/\//, "").split("/")[0] || hostUrl;
  }
}
