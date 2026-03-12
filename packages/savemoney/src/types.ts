/**
 * Common types shared across all cloud providers
 */

export type AnalysisResult = {
  costRisk: CostRisk;
  reason: string;
  suspectedUnused: boolean;
};

/**
 * Base configuration interface that all cloud providers should extend
 */
export type BaseConfig = {
  preferredLocation: string;
  timespanDays: number;
};

export type CostRisk = "high" | "low" | "medium";

/**
 * Configurable thresholds used during resource analysis.
 * All values can be overridden via a cosmiconfig-discovered configuration
 * (e.g. .savemoneyrc.json, savemoney.config.js, or the "savemoney" key in package.json).
 */
export type Thresholds = {
  appService: {
    /** CPU threshold (%) below which usage is flagged as very low. Default: 5 */
    cpuPercent: number;
    /** Memory threshold (%) below which usage is flagged as very low. Default: 10 */
    memoryPercent: number;
    /** CPU threshold (%) for Premium-tier plans below which over-provisioning is flagged. Default: 10 */
    premiumCpuPercent: number;
  };
  containerApp: {
    /** CPU threshold (nanoCores) below which usage is flagged as very low. Default: 1_000_000 (0.001 cores) */
    cpuNanoCores: number;
    /** Memory threshold (bytes) below which usage is flagged as very low. Default: 10_485_760 (10 MB) */
    memoryBytes: number;
    /** Combined Rx+Tx network threshold (bytes/day) below which traffic is flagged as very low. Default: 34_000 */
    networkBytes: number;
  };
  publicIp: {
    /** DDoS inbound bytes/day threshold below which traffic is flagged as very low. Default: 340_000 */
    bytesInDDoS: number;
  };
  staticSite: {
    /** Total bytes sent threshold below which data transfer is flagged as very low. Default: 1_048_576 (1 MB) */
    bytesSent: number;
    /** Total site hits threshold below which traffic is flagged as very low. Default: 100 */
    siteHits: number;
  };
  storage: {
    /** Average daily transaction count below which the account is flagged as very low activity. Default: 10 */
    transactionsPerDay: number;
  };
  vm: {
    /** CPU threshold (%) below which usage is flagged as low. Default: 1 */
    cpuPercent: number;
    /** Network inbound threshold (bytes/day) below which traffic is flagged as low. Default: 3_145_728 (3 MB) */
    networkInBytesPerDay: number;
  };
};

/**
 * Default threshold values reflecting the original hardcoded analysis thresholds.
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
  appService: {
    cpuPercent: 5,
    memoryPercent: 10,
    premiumCpuPercent: 10,
  },
  containerApp: {
    cpuNanoCores: 1_000_000,
    memoryBytes: 10_485_760,
    networkBytes: 34_000,
  },
  publicIp: {
    bytesInDDoS: 340_000,
  },
  staticSite: {
    bytesSent: 1_048_576,
    siteHits: 100,
  },
  storage: {
    transactionsPerDay: 10,
  },
  vm: {
    cpuPercent: 1,
    networkInBytesPerDay: 1024 * 1024 * 3,
  },
};

/**
 * Merges analysis results, preserving existing reasons and combining suspectedUnused flags.
 */
export function mergeResults(
  baseResult: AnalysisResult,
  specificResult: AnalysisResult,
): AnalysisResult {
  return {
    costRisk: specificResult.costRisk,
    reason: baseResult.reason + specificResult.reason,
    suspectedUnused:
      baseResult.suspectedUnused || specificResult.suspectedUnused,
  };
}
