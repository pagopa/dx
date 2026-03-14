/** This module aggregates Techradar usage rows into dashboard-ready shapes. */

const NOT_IN_RADAR_LABEL = "Not in radar";

export interface TechRadarDashboardData {
  adoptionByTool: {
    adoption_percentage: number;
    radar_ref: null | string;
    radar_ring: null | string;
    radar_slug: null | string;
    radar_status: string;
    radar_title: null | string;
    repository_count: number;
    tool_key: string;
    tool_name: string;
  }[];
  repositoriesWithoutDetectedTools: string[];
  repositoryCoverage: {
    aligned_tools: number;
    detected_tools: number;
    repository: string;
  }[];
  repositoryMatrix: {
    evidence_path: null | string;
    radar_ref: null | string;
    radar_ring: null | string;
    radar_status: string;
    radar_status_label: string;
    radar_title: null | string;
    repository: string;
    tool_name: string;
  }[];
  statusDistribution: { name: string; value: number }[];
  summary: {
    aligned_usages: number;
    detected_usages: number;
    repositories_total: number;
    repositories_with_detected_tools: number;
    tools_detected: number;
    usages_not_in_radar: number;
  };
}

export interface TechRadarUsageRow {
  evidencePath: null | string;
  radarRef: null | string;
  radarRing: null | string;
  radarSlug: null | string;
  radarStatus: string;
  radarTitle: null | string;
  repositoryFullName: string;
  toolKey: string;
  toolName: string;
}

const formatRadarStatusLabel = (
  radarRing: null | string,
  radarStatus: string,
): string => {
  if (radarStatus === "aligned" && radarRing) {
    return radarRing;
  }

  return NOT_IN_RADAR_LABEL;
};

const roundPercentage = (value: number): number => Math.round(value * 10) / 10;

export function buildTechRadarDashboardData(
  rows: readonly TechRadarUsageRow[],
  configuredRepositories: readonly string[],
): TechRadarDashboardData {
  const toolUsageIndex = new Map<
    string,
    {
      radarRef: null | string;
      radarRing: null | string;
      radarSlug: null | string;
      radarStatus: string;
      radarTitle: null | string;
      repositories: Set<string>;
      toolKey: string;
      toolName: string;
    }
  >();
  const repositoryCoverageIndex = new Map<
    string,
    {
      alignedTools: number;
      detectedTools: number;
    }
  >();
  const statusDistributionIndex = new Map<string, number>();

  for (const repository of configuredRepositories) {
    repositoryCoverageIndex.set(repository, {
      alignedTools: 0,
      detectedTools: 0,
    });
  }

  for (const row of rows) {
    const toolEntry = toolUsageIndex.get(row.toolKey) ?? {
      radarRef: row.radarRef,
      radarRing: row.radarRing,
      radarSlug: row.radarSlug,
      radarStatus: row.radarStatus,
      radarTitle: row.radarTitle,
      repositories: new Set<string>(),
      toolKey: row.toolKey,
      toolName: row.toolName,
    };

    toolEntry.repositories.add(row.repositoryFullName);
    toolUsageIndex.set(row.toolKey, toolEntry);

    const repositoryCoverage = repositoryCoverageIndex.get(
      row.repositoryFullName,
    );
    if (repositoryCoverage) {
      repositoryCoverage.detectedTools += 1;
      if (row.radarStatus === "aligned") {
        repositoryCoverage.alignedTools += 1;
      }
    }

    const statusLabel = formatRadarStatusLabel(row.radarRing, row.radarStatus);
    statusDistributionIndex.set(
      statusLabel,
      (statusDistributionIndex.get(statusLabel) ?? 0) + 1,
    );
  }

  const adoptionByTool = [...toolUsageIndex.values()]
    .map((entry) => ({
      adoption_percentage:
        configuredRepositories.length === 0
          ? 0
          : roundPercentage(
              (entry.repositories.size / configuredRepositories.length) * 100,
            ),
      radar_ref: entry.radarRef,
      radar_ring: entry.radarRing,
      radar_slug: entry.radarSlug,
      radar_status: entry.radarStatus,
      radar_title: entry.radarTitle,
      repository_count: entry.repositories.size,
      tool_key: entry.toolKey,
      tool_name: entry.toolName,
    }))
    .sort(
      (left, right) =>
        right.repository_count - left.repository_count ||
        left.tool_name.localeCompare(right.tool_name),
    );

  const repositoryCoverage = [...repositoryCoverageIndex.entries()]
    .map(([repository, coverage]) => ({
      aligned_tools: coverage.alignedTools,
      detected_tools: coverage.detectedTools,
      repository,
    }))
    .sort(
      (left, right) =>
        right.detected_tools - left.detected_tools ||
        left.repository.localeCompare(right.repository),
    );

  const repositoryMatrix = [...rows]
    .map((row) => ({
      evidence_path: row.evidencePath,
      radar_ref: row.radarRef,
      radar_ring: row.radarRing,
      radar_status: row.radarStatus,
      radar_status_label: formatRadarStatusLabel(
        row.radarRing,
        row.radarStatus,
      ),
      radar_title: row.radarTitle,
      repository: row.repositoryFullName,
      tool_name: row.toolName,
    }))
    .sort(
      (left, right) =>
        left.repository.localeCompare(right.repository) ||
        left.tool_name.localeCompare(right.tool_name),
    );

  const statusDistribution = [...statusDistributionIndex.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort(
      (left, right) =>
        right.value - left.value || left.name.localeCompare(right.name),
    );

  const repositoriesWithDetectedTools = repositoryCoverage.filter(
    (repository) => repository.detected_tools > 0,
  ).length;
  const repositoriesWithoutDetectedTools = repositoryCoverage
    .filter((repository) => repository.detected_tools === 0)
    .map((repository) => repository.repository);
  const alignedUsages = rows.filter(
    (row) => row.radarStatus === "aligned",
  ).length;

  return {
    adoptionByTool,
    repositoriesWithoutDetectedTools,
    repositoryCoverage,
    repositoryMatrix,
    statusDistribution,
    summary: {
      aligned_usages: alignedUsages,
      detected_usages: rows.length,
      repositories_total: configuredRepositories.length,
      repositories_with_detected_tools: repositoriesWithDetectedTools,
      tools_detected: adoptionByTool.length,
      usages_not_in_radar: rows.length - alignedUsages,
    },
  };
}
