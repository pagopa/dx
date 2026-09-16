"use client";

import { DataTable, SERIES_COLORS, SimpleBarChart } from "@/components/Charts";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DashboardRequestState } from "@/components/DashboardRequestState";
import { DataFreshness } from "@/components/DataFreshness";
import TooltipIcon from "@/components/TooltipIcon";
import { classifyPercentile } from "@/lib/benchmark";
import { formatInteger, formatNumber, formatWithUnit } from "@/lib/format";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardFilters } from "@/lib/useDashboardFilters";

import { benchmarkTooltips as tooltipContent } from "./tooltips";

interface BenchmarkEntry {
  count: null | number;
  percentileRank: null | number;
  repository: string;
  value: null | number;
}

interface BenchmarkMetric {
  category: "adoption" | "delivery" | "quality";
  entries: BenchmarkEntry[];
  key: string;
  label: string;
  lowerIsBetter: boolean;
  median: null | number;
  unit?: string;
}

interface BenchmarkData {
  meta: { days: number; referenceDate: string };
  metrics: BenchmarkMetric[];
}

interface BenchmarkRow {
  count: null | number;
  delta: null | number;
  position: null | string;
  repository: string;
  value: null | number;
}

const CATEGORY_ORDER = ["delivery", "quality"] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  delivery: "Delivery",
  quality: "Quality",
};

const positionLabel = (position: null | string): string => {
  switch (position) {
    case "best":
      return "Best in class";
    case "needs-attention":
      return "Needs attention";
    case "middle":
      return "In line";
    default:
      return "—";
  }
};

const positionClassName = (position: null | string): string => {
  switch (position) {
    case "best":
      return "bg-green-500/15 text-green-300";
    case "needs-attention":
      return "bg-amber-500/15 text-amber-300";
    default:
      return "bg-slate-500/15 text-slate-300";
  }
};

const BenchmarkMetricTable = ({ metric }: { metric: BenchmarkMetric }) => {
  const rows: BenchmarkRow[] = [...metric.entries]
    .sort((left, right) => {
      // Rows without a value always sort last, in both metric directions.
      if (left.value === null && right.value === null) {
        return 0;
      }
      if (left.value === null) {
        return 1;
      }
      if (right.value === null) {
        return -1;
      }
      return metric.lowerIsBetter
        ? left.value - right.value
        : right.value - left.value;
    })
    .map((entry) => ({
      count: entry.count,
      delta:
        entry.value === null || metric.median === null
          ? null
          : entry.value - metric.median,
      position: classifyPercentile(entry.percentileRank, metric.lowerIsBetter),
      repository: entry.repository,
      value: entry.value,
    }));

  // Chart rows use a plain object shape: the chart primitive expects
  // `Record<string, unknown>`, which a named interface does not satisfy.
  const chartData = rows.map((row) => ({
    repository: row.repository,
    value: row.value,
  }));

  return (
    <div className="space-y-4">
      {/* A ranked bar chart with the median as reference makes the spread and
          the outliers visible; the table below carries the exact figures. */}
      <SimpleBarChart
        bars={[{ color: SERIES_COLORS.blue, key: "value", name: metric.label }]}
        data={chartData}
        layout="vertical"
        referenceLines={
          metric.median === null
            ? undefined
            : [{ label: "median", value: metric.median }]
        }
        sortDirection={metric.lowerIsBetter ? "asc" : "desc"}
        sortKey="value"
        title={`${metric.label} across repositories`}
        tooltip={tooltipContent.benchmark}
        unit={metric.unit}
        xKey="repository"
        yAxisWidth={160}
      />
      <DataTable
        columns={[
          { key: "repository", label: "Repository" },
          {
            key: "value",
            label: metric.label,
            renderCell: (value) =>
              typeof value === "number"
                ? formatWithUnit(value, metric.unit, 2)
                : "—",
          },
          {
            key: "count",
            label: "N",
            renderCell: (value) =>
              typeof value === "number" ? formatInteger(value) : "—",
          },
          {
            key: "delta",
            label: "vs median",
            renderCell: (value) =>
              typeof value === "number"
                ? `${value > 0 ? "+" : ""}${formatNumber(value, 2)}`
                : "—",
          },
          {
            key: "position",
            label: "Position",
            renderCell: (value) => (
              <span
                className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${positionClassName(String(value))}`}
              >
                {positionLabel(String(value))}
              </span>
            ),
          },
        ]}
        data={rows}
        title={`${metric.label} (median ${formatWithUnit(metric.median, metric.unit, 2)})`}
        tooltip={tooltipContent.benchmark}
      />
    </div>
  );
};

export default function BenchmarkDashboard() {
  const { days, setDays } = useDashboardFilters({ mode: "time-only" });

  const { data, error, loading, refetch } = useDashboardData<BenchmarkData>(
    "benchmark",
    { days },
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-bold text-white">
          Cross-repository Benchmark
        </h2>
        <TooltipIcon
          content={tooltipContent.title}
          label="Cross-repository Benchmark"
        />
      </div>

      <DashboardFilters
        mode="time-only"
        onTimeIntervalChange={setDays}
        timeInterval={days}
      />
      <DashboardRequestState
        error={error}
        loading={loading}
        onRetry={refetch}
      />

      {data && (
        <>
          <DataFreshness
            className="mb-4"
            referenceDate={data.meta.referenceDate}
          />
          <div className="space-y-6">
            {CATEGORY_ORDER.map((category) => {
              const categoryMetrics = data.metrics.filter(
                (metric) => metric.category === category,
              );

              if (categoryMetrics.length === 0) {
                return null;
              }

              return (
                <section className="space-y-3" key={category}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {categoryMetrics.map((metric) => (
                      <BenchmarkMetricTable key={metric.key} metric={metric} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
