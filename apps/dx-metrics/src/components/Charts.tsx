"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
  title: string;
  children: React.ReactNode;
  className?: string;
  tooltip?: string;
}

export function ChartWrapper({
  title,
  children,
  className = "",
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

// --- Line Chart ---
interface SimpleLineChartProps {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; name: string; color?: string }[];
  className?: string;
  xValueFormatter?: (value: any) => string;
  tooltip?: string;
}

export function SimpleLineChart({
  title,
  data,
  xKey,
  lines,
  className,
  xValueFormatter,
  tooltip,
}: SimpleLineChartProps) {
  return (
    <ChartWrapper title={title} className={className} tooltip={tooltip}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        width="100%"
        height={288}
        responsive
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#21262d"
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tick={{
            fontSize: 10,
            fill: "#8b949e",
            textAnchor: data.length > 6 ? "end" : "middle",
          }}
          stroke="#30363d"
          tickFormatter={
            xValueFormatter ??
            ((v: string) => {
              const d = new Date(v);
              return isNaN(d.getTime())
                ? v
                : d.toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  });
            })
          }
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
          angle={data.length > 6 ? -35 : 0}
          tickMargin={data.length > 6 ? 15 : 0}
          height={data.length > 6 ? 70 : 30}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#8b949e" }}
          stroke="#30363d"
          domain={[0, "auto"]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "8px",
            color: "#e6edf3",
          }}
          itemStyle={{ color: "#e6edf3" }}
          formatter={(value) => {
            if (typeof value === "number") {
              return value.toFixed(2);
            }
            return value;
          }}
        />
        <Legend
          wrapperStyle={{
            paddingTop: "10px",
            fontSize: "12px",
            color: "#8b949e",
          }}
        />
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="linear"
            dataKey={line.key}
            name={line.name}
            stroke={line.color || COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartWrapper>
  );
}

// --- Bar Chart ---
interface SimpleBarChartProps {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; name: string; color?: string; stackId?: string }[];
  className?: string;
  layout?: "horizontal" | "vertical";
  xValueFormatter?: (value: any) => string;
  tooltip?: string;
}

export function SimpleBarChart({
  title,
  data,
  xKey,
  bars,
  className,
  layout = "horizontal",
  xValueFormatter,
  tooltip,
}: SimpleBarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <ChartWrapper title={title} className={className} tooltip={tooltip}>
      <BarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={{
          top: 10,
          right: 30,
          left: 10,
          bottom: isVertical ? 10 : 5,
        }}
        width="100%"
        height={288}
        responsive
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#21262d"
          vertical={false}
        />
        <XAxis
          dataKey={isVertical ? undefined : xKey}
          type={isVertical ? "number" : "category"}
          tick={{
            fontSize: isVertical ? 11 : 9,
            fill: "#8b949e",
            ...(isVertical
              ? {}
              : {
                  textAnchor: data.length > 4 ? "end" : "middle",
                }),
          }}
          stroke="#30363d"
          tickFormatter={xValueFormatter}
          {...(isVertical
            ? { domain: [0, (max: number) => Math.ceil(max * 1.1)] }
            : {
                interval: Math.max(0, Math.floor(data.length / 8) - 1),
                angle: data.length > 4 ? -45 : 0,
                tickMargin: data.length > 4 ? 15 : 0,
                height: data.length > 4 ? 80 : 30,
              })}
        />
        <YAxis
          dataKey={isVertical ? xKey : undefined}
          type={isVertical ? "category" : "number"}
          tick={{ fontSize: 11, fill: "#8b949e" }}
          stroke="#30363d"
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
          itemStyle={{ color: "#e6edf3" }}
          formatter={(value) => {
            if (typeof value === "number") {
              return value.toFixed(2);
            }
            return value;
          }}
        />
        <Legend
          wrapperStyle={{
            paddingTop: "20px",
            fontSize: "12px",
            color: "#8b949e",
          }}
        />
        {bars.map((bar, i) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color || COLORS[i % COLORS.length]}
            stackId={bar.stackId}
          />
        ))}
      </BarChart>
    </ChartWrapper>
  );
}

// --- Pie Chart ---
interface SimplePieChartProps {
  title: string;
  data: { name: string; value: number }[];
  className?: string;
  tooltip?: string;
}

export function SimplePieChart({
  title,
  data,
  className,
  tooltip,
}: SimplePieChartProps) {
  return (
    <ChartWrapper title={title} className={className} tooltip={tooltip}>
      <ResponsiveContainer width="100%" height={288}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine
            label={({ name, percent }) =>
              `${name} (${((percent || 0) * 100).toFixed(0)}%)`
            }
            outerRadius={80}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
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
            itemStyle={{ color: "#e6edf3" }}
            formatter={(value) => {
              if (typeof value === "number") {
                return value.toFixed(2);
              }
              return value;
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", color: "#8b949e" }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
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
  title: string;
  columns: ReadonlyArray<DataTableColumn<TData>>;
  data: readonly TData[];
  className?: string;
  tooltip?: string;
}

export function DataTable<TData extends object>({
  title,
  columns,
  data,
  className = "",
  tooltip,
}: DataTableProps<TData>) {
  const [sortKey, setSortKey] =
    React.useState<Extract<keyof TData, string> | null>(null);
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
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer select-none px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white hover:text-[#e6edf3] transition-colors"
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
                key={i}
                className="border-b border-[#21262d] hover:bg-[#161b22] transition-colors group"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-[#e6edf3] font-medium"
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

export { COLORS };
