"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import TooltipIcon from "@/components/TooltipIcon";
import { focusRing } from "@/lib/utils";

/** Horizontal reference marker (target or previous-period average). */
interface ChartReferenceLine {
  readonly color?: string;
  readonly label: string;
  readonly value: number;
}

/**
 * The only series palette. Named by hue because these are primitives: a chart
 * picks a key by meaning, and the value can be retuned in one place.
 */
export const SERIES_COLORS = {
  green: "#238636",
  gray: "#8b949e",
  blue: "#1f6feb",
  amber: "#d29922",
  purple: "#a371f7",
  brightGreen: "#39d353",
  lightBlue: "#58a6ff",
  red: "#f85149",
} as const;

/** Default assignment order for multi-series charts. */
const COLORS: string[] = Object.values(SERIES_COLORS);

interface ChartWrapperProps {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  /**
   * When true the chart is replaced by an empty state. The state has to be
   * rendered outside `role="img"` or assistive tech never reaches it.
   */
  isEmpty?: boolean;
  title: string;
  tooltip?: string;
}

// --- Data Table ---
interface DataTableColumn<TData extends object> {
  key: Extract<keyof TData, string>;
  label: string;
  renderCell?: (
    value: TData[Extract<keyof TData, string>],
    row: TData,
  ) => React.ReactNode;
}

interface DataTableProps<TData extends object> {
  className?: string;
  columns: readonly DataTableColumn<TData>[];
  data: readonly TData[];
  title: string;
  tooltip?: string;
}

// --- Bar Chart ---
interface SimpleBarChartProps {
  ariaLabel?: string;
  bars: { color?: string; key: string; name: string; stackId?: string }[];
  className?: string;
  data: Record<string, unknown>[];
  layout?: "horizontal" | "vertical";
  referenceLines?: readonly ChartReferenceLine[];
  title: string;
  tooltip?: string;
  tooltipFormatter?: (value: number) => string;
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
}

// --- Line Chart ---
interface SimpleLineChartProps {
  ariaLabel?: string;
  className?: string;
  data: Record<string, unknown>[];
  lines: { color?: string; key: string; name: string }[];
  referenceLines?: readonly ChartReferenceLine[];
  title: string;
  tooltip?: string;
  tooltipFormatter?: (value: number) => string;
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
  /** When true (default) the y-axis starts at zero. */
  zeroBaseline?: boolean;
}

// --- Pie Chart ---
interface SimplePieChartProps {
  className?: string;
  data: { name: string; value: number }[];
  title: string;
  tooltip?: string;
}

export function ChartWrapper({
  ariaLabel,
  children,
  className = "",
  footer,
  isEmpty = false,
  title,
  tooltip,
}: ChartWrapperProps) {
  return (
    <div
      className={`rounded-xl border border-[#30363d] bg-[#0d1117] p-6 shadow-sm transition-colors hover:border-[#8b949e]/50 ${className}`}
    >
      <div className="mb-6 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
          {title}
        </h3>
        {tooltip && <TooltipIcon content={tooltip} label={title} />}
      </div>
      {isEmpty ? (
        <div className="flex h-72 items-center justify-center text-center text-sm text-gray-400">
          No data for the selected period. Try a wider time interval.
        </div>
      ) : (
        <div
          aria-label={ariaLabel ?? title}
          className="w-full"
          role="img"
          style={{ height: "288px" }}
        >
          {children}
        </div>
      )}
      {!isEmpty && footer}
    </div>
  );
}

/** Tabular fallback exposing the same series rendered by a chart. */
function ChartDataTable({
  chartTitle,
  data,
  series,
  xKey,
  xValueFormatter,
}: {
  chartTitle: string;
  data: Record<string, unknown>[];
  series: readonly { key: string; name: string }[];
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
}) {
  return (
    <div className="custom-scrollbar mt-4 max-h-64 overflow-auto">
      <table aria-label={`${chartTitle} data`} className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-[#30363d]">
            <th
              className="px-3 py-2 text-left font-semibold text-gray-400"
              scope="col"
            >
              {xKey}
            </th>
            {series.map((entry) => (
              <th
                className="px-3 py-2 text-left font-semibold text-gray-400"
                key={entry.key}
                scope="col"
              >
                {entry.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr className="border-b border-[#21262d]" key={index}>
              <td className="px-3 py-1.5 text-gray-300">
                {xValueFormatter
                  ? xValueFormatter(row[xKey])
                  : String(row[xKey] ?? "")}
              </td>
              {series.map((entry) => (
                <td className="px-3 py-1.5 text-gray-300" key={entry.key}>
                  {row[entry.key] === null || row[entry.key] === undefined
                    ? "—"
                    : String(row[entry.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Toggle button plus tabular fallback shared by the chart components. */
function ChartDataToggle({
  chartTitle,
  data,
  series,
  xKey,
  xValueFormatter,
}: {
  chartTitle: string;
  data: Record<string, unknown>[];
  series: readonly { key: string; name: string }[];
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const regionId = React.useId();

  return (
    <>
      <button
        aria-controls={regionId}
        aria-expanded={isOpen}
        className={`mt-3 rounded text-xs font-medium text-gray-400 transition-colors hover:text-gray-200 ${focusRing}`}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {isOpen ? "Hide data" : "Show data"}
      </button>
      <div id={regionId}>
        {isOpen && (
          <ChartDataTable
            chartTitle={chartTitle}
            data={data}
            series={series}
            xKey={xKey}
            xValueFormatter={xValueFormatter}
          />
        )}
      </div>
    </>
  );
}

export function DataTable<TData extends object>({
  className = "",
  columns,
  data,
  title,
  tooltip,
}: DataTableProps<TData>) {
  const [sortKey, setSortKey] = React.useState<Extract<
    keyof TData,
    string
  > | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const handleSort = (key: Extract<keyof TData, string>) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = React.useMemo(() => {
    if (!sortKey) {
      return data;
    }

    return [...data].sort((a, b) => {
      const leftValue = a[sortKey] ?? "";
      const rightValue = b[sortKey] ?? "";
      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);
      const cmp =
        !isNaN(leftNumber) && !isNaN(rightNumber)
          ? leftNumber - rightNumber
          : String(leftValue).localeCompare(String(rightValue));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return (
    <div
      className={`rounded-xl border border-[#30363d] bg-[#0d1117] p-6 shadow-sm transition-colors hover:border-[#8b949e]/50 ${className}`}
    >
      <div className="mb-6 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
          {title}
        </h3>
        {tooltip && <TooltipIcon content={tooltip} label={title} />}
      </div>
      <div className="custom-scrollbar max-h-96 overflow-auto">
        <table aria-label={title} className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363d]">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;

                return (
                  <th
                    aria-sort={
                      isSorted
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white"
                    key={col.key}
                    scope="col"
                  >
                    <button
                      className={`inline-flex items-center gap-1 rounded transition-colors hover:text-[#e6edf3] ${focusRing}`}
                      onClick={() => handleSort(col.key)}
                      type="button"
                    >
                      {col.label}
                      <span aria-hidden="true">
                        {isSorted ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                className="group border-b border-[#21262d] transition-colors hover:bg-[#161b22]"
                key={i}
              >
                {columns.map((col) => (
                  <td
                    className="px-4 py-3 font-medium text-[#e6edf3]"
                    key={col.key}
                  >
                    {col.renderCell
                      ? col.renderCell(row[col.key], row)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SimpleBarChart({
  ariaLabel,
  bars,
  className,
  data,
  layout = "horizontal",
  referenceLines,
  title,
  tooltip,
  tooltipFormatter,
  xKey,
  xValueFormatter,
}: SimpleBarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <ChartWrapper
      ariaLabel={ariaLabel}
      className={className}
      footer={
        <ChartDataToggle
          chartTitle={title}
          data={data}
          series={bars.map((bar) => ({ key: bar.key, name: bar.name }))}
          xKey={xKey}
          xValueFormatter={xValueFormatter}
        />
      }
      isEmpty={data.length === 0}
      title={title}
      tooltip={tooltip}
    >
      <BarChart
        data={data}
        height={288}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={{
          bottom: isVertical ? 10 : 5,
          left: 10,
          right: 30,
          top: 10,
        }}
        responsive
        width="100%"
      >
        <CartesianGrid
          stroke="#21262d"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey={isVertical ? undefined : xKey}
          stroke="#30363d"
          tick={{
            fill: "#8b949e",
            fontSize: 11,
            ...(isVertical
              ? {}
              : {
                  textAnchor: data.length > 4 ? "end" : "middle",
                }),
          }}
          tickFormatter={xValueFormatter}
          type={isVertical ? "number" : "category"}
          {...(isVertical
            ? { domain: [0, (max: number) => Math.ceil(max * 1.1)] }
            : {
                angle: data.length > 4 ? -45 : 0,
                height: data.length > 4 ? 80 : 30,
                interval: Math.max(0, Math.floor(data.length / 8) - 1),
                tickMargin: data.length > 4 ? 15 : 0,
              })}
        />
        <YAxis
          dataKey={isVertical ? xKey : undefined}
          stroke="#30363d"
          tick={{ fill: "#8b949e", fontSize: 11 }}
          type={isVertical ? "category" : "number"}
          {...(isVertical
            ? { width: 120 }
            : { domain: [0, (max: number) => Math.ceil(max * 1.1)] })}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "8px",
            color: "#e6edf3",
          }}
          formatter={(value) => {
            if (typeof value === "number") {
              return tooltipFormatter
                ? tooltipFormatter(value)
                : value.toFixed(2);
            }
            return value;
          }}
          itemStyle={{ color: "#e6edf3" }}
        />
        <Legend
          wrapperStyle={{
            color: "#8b949e",
            fontSize: "12px",
            paddingTop: "20px",
          }}
        />
        {bars.map((bar, i) => (
          <Bar
            dataKey={bar.key}
            fill={bar.color || COLORS[i % COLORS.length]}
            key={bar.key}
            name={bar.name}
            stackId={bar.stackId}
          />
        ))}
        {referenceLines?.map((line) =>
          isVertical ? (
            <ReferenceLine
              key={`ref-${line.label}`}
              label={line.label}
              stroke={line.color ?? SERIES_COLORS.red}
              strokeDasharray="4 4"
              x={line.value}
            />
          ) : (
            <ReferenceLine
              key={`ref-${line.label}`}
              label={line.label}
              stroke={line.color ?? SERIES_COLORS.red}
              strokeDasharray="4 4"
              y={line.value}
            />
          ),
        )}
      </BarChart>
    </ChartWrapper>
  );
}

export function SimpleLineChart({
  ariaLabel,
  className,
  data,
  lines,
  referenceLines,
  title,
  tooltip,
  tooltipFormatter,
  xKey,
  xValueFormatter,
  zeroBaseline = true,
}: SimpleLineChartProps) {
  return (
    <ChartWrapper
      ariaLabel={ariaLabel}
      className={className}
      footer={
        <ChartDataToggle
          chartTitle={title}
          data={data}
          series={lines.map((line) => ({ key: line.key, name: line.name }))}
          xKey={xKey}
          xValueFormatter={xValueFormatter}
        />
      }
      isEmpty={data.length === 0}
      title={title}
      tooltip={tooltip}
    >
      <LineChart
        data={data}
        height={288}
        margin={{ bottom: 5, left: 10, right: 30, top: 20 }}
        responsive
        width="100%"
      >
        <CartesianGrid
          stroke="#21262d"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          angle={data.length > 6 ? -35 : 0}
          dataKey={xKey}
          height={data.length > 6 ? 70 : 30}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
          stroke="#30363d"
          tick={{
            fill: "#8b949e",
            fontSize: 11,
            textAnchor: data.length > 6 ? "end" : "middle",
          }}
          tickFormatter={
            xValueFormatter ??
            ((v: string) => {
              const d = new Date(v);
              return isNaN(d.getTime())
                ? v
                : d.toLocaleDateString("en", {
                    day: "numeric",
                    month: "short",
                  });
            })
          }
          tickMargin={data.length > 6 ? 15 : 0}
        />
        <YAxis
          domain={zeroBaseline ? [0, "auto"] : ["auto", "auto"]}
          stroke="#30363d"
          tick={{ fill: "#8b949e", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "8px",
            color: "#e6edf3",
          }}
          formatter={(value) => {
            if (typeof value === "number") {
              return tooltipFormatter
                ? tooltipFormatter(value)
                : value.toFixed(2);
            }
            return value;
          }}
          itemStyle={{ color: "#e6edf3" }}
        />
        <Legend
          wrapperStyle={{
            color: "#8b949e",
            fontSize: "12px",
            paddingTop: "10px",
          }}
        />
        {lines.map((line, i) => (
          <Line
            dataKey={line.key}
            dot={false}
            isAnimationActive={false}
            key={line.key}
            name={line.name}
            stroke={line.color || COLORS[i % COLORS.length]}
            strokeWidth={2}
            type="linear"
          />
        ))}
        {referenceLines?.map((line) => (
          <ReferenceLine
            key={`ref-${line.label}`}
            label={line.label}
            stroke={line.color ?? SERIES_COLORS.red}
            strokeDasharray="4 4"
            y={line.value}
          />
        ))}
      </LineChart>
    </ChartWrapper>
  );
}

export function SimplePieChart({
  className,
  data,
  title,
  tooltip,
}: SimplePieChartProps) {
  return (
    <ChartWrapper
      className={className}
      isEmpty={data.length === 0}
      title={title}
      tooltip={tooltip}
    >
      <ResponsiveContainer height={288} width="100%">
        <PieChart>
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey="value"
            label={({
              name,
              percent,
            }: {
              name?: number | string;
              percent?: number;
            }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
            labelLine
            outerRadius={80}
          >
            {data.map((entry, index) => (
              <Cell
                fill={COLORS[index % COLORS.length]}
                key={`cell-${index}`}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "8px",
              color: "#e6edf3",
            }}
            formatter={(value) => {
              if (typeof value === "number") {
                return value.toFixed(2);
              }
              return value;
            }}
            itemStyle={{ color: "#e6edf3" }}
          />
          <Legend wrapperStyle={{ color: "#8b949e", fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
