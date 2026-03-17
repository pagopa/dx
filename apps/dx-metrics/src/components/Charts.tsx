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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import TooltipIcon from "@/components/TooltipIcon";

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
  children: React.ReactNode;
  className?: string;
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
  bars: { color?: string; key: string; name: string; stackId?: string }[];
  className?: string;
  data: Record<string, unknown>[];
  layout?: "horizontal" | "vertical";
  title: string;
  tooltip?: string;
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
}

// --- Line Chart ---
interface SimpleLineChartProps {
  className?: string;
  data: Record<string, unknown>[];
  lines: { color?: string; key: string; name: string }[];
  title: string;
  tooltip?: string;
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
}

// --- Pie Chart ---
interface SimplePieChartProps {
  className?: string;
  data: { name: string; value: number }[];
  title: string;
  tooltip?: string;
}

export function ChartWrapper({
  children,
  className = "",
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
      <div className="w-full" style={{ height: "288px" }}>
        {children}
      </div>
    </div>
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

export function SimpleBarChart({
  bars,
  className,
  data,
  layout = "horizontal",
  title,
  tooltip,
  xKey,
  xValueFormatter,
}: SimpleBarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <ChartWrapper className={className} title={title} tooltip={tooltip}>
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
              return value.toFixed(2);
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
      </BarChart>
    </ChartWrapper>
  );
}

export function SimpleLineChart({
  className,
  data,
  lines,
  title,
  tooltip,
  xKey,
  xValueFormatter,
}: SimpleLineChartProps) {
  return (
    <ChartWrapper className={className} title={title} tooltip={tooltip}>
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
          domain={[0, "auto"]}
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
              return value.toFixed(2);
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
    <ChartWrapper className={className} title={title} tooltip={tooltip}>
      <ResponsiveContainer height={288} width="100%">
        <PieChart>
          <Pie
            cx="50%"
            cy="50%"
            data={data}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} (${((percent || 0) * 100).toFixed(0)}%)`
            }
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
