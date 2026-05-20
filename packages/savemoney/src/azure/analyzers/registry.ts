/**
 * Default registry of Azure analyzers.
 *
 * Each entry wraps an existing per-type analyzer function (kept in
 * `../resources/`) and exposes it through the unified `Analyzer`
 * interface. The orchestrator simply iterates the registry — no big
 * `switch` statement, no risk of forgetting to wire a new analyzer
 * into the orchestrator when the catalog grows.
 *
 * Adding a new analyzer is a single insertion here.
 */

import {
  analyzeAppServicePlan,
  analyzeContainerApp,
  analyzeDisk,
  analyzeNic,
  analyzePrivateEndpoint,
  analyzePublicIp,
  analyzeStaticSite,
  analyzeStorageAccount,
  analyzeVM,
} from "../resources/index.js";
import type { Analyzer } from "./types.js";

/**
 * Builds the default set of analyzers in the same order they were
 * previously evaluated by the orchestrator's `switch` statement. The
 * order is not behaviourally meaningful today (each resource is matched
 * by exactly one analyzer) but is kept deterministic for predictable
 * logging and to ease future debugging.
 */
export function createDefaultAnalyzers(): Analyzer[] {
  return [
    {
      analyze: ({ clients, resource, thresholds, timespanDays, verbose }) =>
        analyzeContainerApp(
          resource,
          clients.containerApps,
          clients.monitor,
          timespanDays,
          thresholds,
          verbose,
        ),
      id: "azure.container-app",
      supports: (r) => r.type?.toLowerCase() === "microsoft.app/containerapps",
    },
    {
      analyze: ({ clients, resource, verbose }) =>
        analyzeDisk(resource, clients.compute, verbose),
      id: "azure.disk",
      supports: (r) => r.type?.toLowerCase() === "microsoft.compute/disks",
    },
    {
      analyze: ({ clients, resource, thresholds, timespanDays, verbose }) =>
        analyzeVM(
          resource,
          clients.monitor,
          clients.compute,
          timespanDays,
          thresholds,
          verbose,
        ),
      id: "azure.vm",
      supports: (r) =>
        r.type?.toLowerCase() === "microsoft.compute/virtualmachines",
    },
    {
      analyze: ({ clients, resource, verbose }) =>
        analyzeNic(resource, clients.network, verbose),
      id: "azure.nic",
      supports: (r) =>
        r.type?.toLowerCase() === "microsoft.network/networkinterfaces",
    },
    {
      analyze: ({ clients, resource, verbose }) =>
        analyzePrivateEndpoint(resource, clients.network, verbose),
      id: "azure.private-endpoint",
      supports: (r) =>
        r.type?.toLowerCase() === "microsoft.network/privateendpoints",
    },
    {
      analyze: ({ clients, resource, thresholds, timespanDays, verbose }) =>
        analyzePublicIp(
          resource,
          clients.network,
          clients.monitor,
          timespanDays,
          thresholds,
          verbose,
        ),
      id: "azure.public-ip",
      supports: (r) =>
        r.type?.toLowerCase() === "microsoft.network/publicipaddresses",
    },
    {
      analyze: ({ clients, resource, thresholds, timespanDays, verbose }) =>
        analyzeStorageAccount(
          resource,
          clients.monitor,
          timespanDays,
          thresholds,
          verbose,
        ),
      id: "azure.storage-account",
      supports: (r) =>
        r.type?.toLowerCase() === "microsoft.storage/storageaccounts",
    },
    {
      analyze: ({ clients, resource, thresholds, timespanDays, verbose }) =>
        analyzeAppServicePlan(
          resource,
          clients.webSite,
          clients.monitor,
          timespanDays,
          thresholds,
          verbose,
        ),
      id: "azure.app-service-plan",
      supports: (r) => r.type?.toLowerCase() === "microsoft.web/serverfarms",
    },
    {
      analyze: ({ clients, resource, thresholds, timespanDays, verbose }) =>
        analyzeStaticSite(
          resource,
          clients.monitor,
          timespanDays,
          thresholds,
          verbose,
        ),
      id: "azure.static-web-app",
      supports: (r) => r.type?.toLowerCase() === "microsoft.web/staticsites",
    },
  ];
}
