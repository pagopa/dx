/** This module aggregates Techradar usage rows into dashboard-ready shapes. */

import type {
  TechRadarDashboardResult,
  TechRadarUsageRow,
} from "@/adapters/db/techradar/schemas";

const NOT_IN_RADAR_LABEL = "Not in radar";

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
): TechRadarDashboardResult {
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
      adoptionPercentage:
        configuredRepositories.length === 0
          ? 0
          : roundPercentage(
              (entry.repositories.size / configuredRepositories.length) * 100,
            ),
      radarRef: entry.radarRef,
      radarRing: entry.radarRing,
      radarSlug: entry.radarSlug,
      radarStatus: entry.radarStatus,
      radarTitle: entry.radarTitle,
      repositoryCount: entry.repositories.size,
      toolKey: entry.toolKey,
      toolName: entry.toolName,
    }))
    .sort(
      (left, right) =>
        right.repositoryCount - left.repositoryCount ||
        left.toolName.localeCompare(right.toolName),
    );

  const repositoryCoverage = [...repositoryCoverageIndex.entries()]
    .map(([repository, coverage]) => ({
      alignedTools: coverage.alignedTools,
      detectedTools: coverage.detectedTools,
      repository,
    }))
    .sort(
      (left, right) =>
        right.detectedTools - left.detectedTools ||
        left.repository.localeCompare(right.repository),
    );

  const repositoryMatrix = [...rows]
    .map((row) => ({
      evidencePath: row.evidencePath,
      radarRef: row.radarRef,
      radarRing: row.radarRing,
      radarStatus: row.radarStatus,
      radarStatusLabel: formatRadarStatusLabel(row.radarRing, row.radarStatus),
      radarTitle: row.radarTitle,
      repository: row.repositoryFullName,
      toolName: row.toolName,
    }))
    .sort(
      (left, right) =>
        left.repository.localeCompare(right.repository) ||
        left.toolName.localeCompare(right.toolName),
    );

  const statusDistribution = [...statusDistributionIndex.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort(
      (left, right) =>
        right.value - left.value || left.name.localeCompare(right.name),
    );

  const repositoriesWithDetectedTools = repositoryCoverage.filter(
    (repository) => repository.detectedTools > 0,
  ).length;
  const repositoriesWithoutDetectedTools = repositoryCoverage
    .filter((repository) => repository.detectedTools === 0)
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
      alignedUsages: alignedUsages,
      detectedUsages: rows.length,
      repositoriesTotal: configuredRepositories.length,
      repositoriesWithDetectedTools: repositoriesWithDetectedTools,
      toolsDetected: adoptionByTool.length,
      usagesNotInRadar: rows.length - alignedUsages,
    },
  };
}
