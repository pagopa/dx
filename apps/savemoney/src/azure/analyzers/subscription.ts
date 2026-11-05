/**
 * Subscription-level analyzer plugin contract.
 *
 * Some data sources are not naturally per-resource. Azure Advisor, for
 * example, returns a flat list of recommendations for an entire
 * subscription in a single call; future quota / `Microsoft.Capacity/usages`
 * analyzers will follow the same shape.
 *
 * A `SubscriptionAnalyzer` is invoked once per subscription. It returns a
 * flat list of `Finding`s carrying the `resourceId` they refer to; the
 * orchestrator merges those findings into the per-resource reports.
 *
 * This interface is intentionally additive: per-resource `Analyzer`s
 * (see `./types.ts`) keep working untouched. Sources written against the
 * two interfaces can coexist in the same run.
 */

import type { TokenCredential } from "@azure/identity";

import type { Finding } from "../../finding.js";

/**
 * Contract every subscription-level analyzer must satisfy.
 */
export type SubscriptionAnalyzer = {
  /**
   * Runs the analyzer for the given subscription. Implementations should
   * be resilient: a failure here must not abort the whole run, the
   * orchestrator logs and continues with the remaining analyzers.
   */
  analyze(ctx: SubscriptionContext): Promise<Finding[]>;
  /**
   * Stable identifier of the analyzer (e.g. `azure.advisor`,
   * `azure.quota`). Used for logging and future deduplication logic.
   */
  readonly id: string;
};

/**
 * Context passed to every subscription-level analyzer.
 */
export type SubscriptionContext = {
  /**
   * Azure credential to instantiate management clients. The orchestrator
   * builds it once and reuses it across analyzers.
   */
  credential: TokenCredential;
  /**
   * Subscription ID to analyze.
   */
  subscriptionId: string;
  /**
   * Whether verbose logging is enabled.
   */
  verbose: boolean;
};
