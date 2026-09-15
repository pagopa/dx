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

/** Horizontal reference marker (target or previous-period average). */
interface ChartReferenceLine {
  readonly color?: string;
  readonly label: string;
  readonly value: number;
}

const COLORS = [
  "#238636", // green
  "#8b949e", // grey
  "#1f6feb", // blue
  "#d29922", // golden
  "#a371f7", // purple
  "#39d353", // bright green
  "#58a6ff", // light blue
  "#f85149", // red
];

interface ChartWrapperProps {
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
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
  title,
  tooltip,
}: ChartWrapperProps) {
  return (
    <div
      className={`rounded-xl border border-[#30363d] bg-[#0d1117] p-6 shadow-sm transition-all hover:border-[#8b949e]/50 ${className}`}
    >
      <div className="mb-6 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
          {title}
        </h3>
        {tooltip && <TooltipIcon content={tooltip} />}
      </div>
      <div
        aria-label={ariaLabel ?? title}
        className="w-full"
        role="img"
        style={{ height: "288px" }}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}

/** Tabular fallback exposing the same series rendered by a chart. */
function ChartDataTable({
  data,
  series,
  xKey,
  xValueFormatter,
}: {
  data: Record<string, unknown>[];
  series: readonly { key: string; name: string }[];
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
}) {
  return (
    <div className="custom-scrollbar mt-4 max-h-64 overflow-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-[#30363d]">
            <th className="px-3 py-2 text-left font-semibold text-gray-400">
              {xKey}
            </th>
            {series.map((entry) => (
              <th
                className="px-3 py-2 text-left font-semibold text-gray-400"
                key={entry.key}
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
  data,
  series,
  xKey,
  xValueFormatter,
}: {
  data: Record<string, unknown>[];
  series: readonly { key: string; name: string }[];
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        className="mt-3 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {isOpen ? "Hide data" : "Show data"}
      </button>
      {isOpen && (
        <ChartDataTable
          data={data}
          series={series}
          xKey={xKey}
          xValueFormatter={xValueFormatter}
        />
      )}
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
      className={`rounded-xl border border-[#30363d] bg-[#0d1117] p-6 shadow-sm transition-all hover:border-[#8b949e]/50 ${className}`}
    >
      <div className="mb-6 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
          {title}
        </h3>
        {tooltip && <TooltipIcon content={tooltip} />}
      </div>
      <div className="max-h-96 overflow-auto custom-scrollbar">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363d]">
              {columns.map((col) => (
                <th
                  className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white hover:text-[#e6edf3] transition-colors"
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                className="border-b border-[#21262d] hover:bg-[#161b22] transition-colors group"
                key={i}
              >
                {columns.map((col) => (
                  <td
                    className="px-4 py-3 text-[#e6edf3] font-medium"
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

const CHART_EMPTY_STATE = (
  <div className="flex h-full items-center justify-center text-sm text-gray-500">
    No data for the selected period.
  </div>
);

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
          data={data}
          series={bars.map((bar) => ({ key: bar.key, name: bar.name }))}
          xKey={xKey}
          xValueFormatter={xValueFormatter}
        />
      }
      title={title}
      tooltip={tooltip}
    >
      {data.length === 0 ? (
        CHART_EMPTY_STATE
      ) : (
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
              fontSize: isVertical ? 11 : 9,
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
                stroke={line.color ?? "#f85149"}
                strokeDasharray="4 4"
                x={line.value}
              />
            ) : (
              <ReferenceLine
                key={`ref-${line.label}`}
                label={line.label}
                stroke={line.color ?? "#f85149"}
                strokeDasharray="4 4"
                y={line.value}
              />
            ),
          )}
        </BarChart>
      )}
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
          data={data}
          series={lines.map((line) => ({ key: line.key, name: line.name }))}
          xKey={xKey}
          xValueFormatter={xValueFormatter}
        />
      }
      title={title}
      tooltip={tooltip}
    >
      {data.length === 0 ? (
        CHART_EMPTY_STATE
      ) : (
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
              fontSize: 10,
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
              stroke={line.color ?? "#f85149"}
              strokeDasharray="4 4"
              y={line.value}
            />
          ))}
        </LineChart>
      )}
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
    <ChartWrapper className={className} title={title} tooltip={tooltip}>
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

export { COLORS };
