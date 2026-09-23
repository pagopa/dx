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
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import TooltipIcon from "@/components/TooltipIcon";
import {
  buildChartCsv,
  csvFileName,
  formatChartNumber,
  formatSeriesValue,
  sortChartData,
} from "@/lib/chart-data";
import {
  PIE_ORDER,
  SERIES_ORDER,
  useChartChrome,
  useSeriesColors,
} from "@/lib/chart-theme";
import { useDateFormatters } from "@/lib/locale";
import { focusRing } from "@/lib/utils";

/** Horizontal reference marker (target or previous-period average). */
interface ChartReferenceLine {
  readonly color?: string;
  readonly label: string;
  readonly value: number;
}

/**
 * Shaded band around a target value, e.g. the tolerance inside which a metric
 * is still considered on target. Mirrors the severity rules so the chart and
 * the metric cards agree on what "good" looks like. Drawn unlabelled: the
 * adjacent target line already names the reference.
 */
interface ChartTargetBand {
  readonly from: number;
  readonly to: number;
}

/** Shared number formatter so charts agree with the metric cards. */
const formatTooltipValue = (
  value: unknown,
  formatter?: (value: number) => string,
  unit?: string,
): React.ReactNode => {
  if (typeof value !== "number") {
    return value as React.ReactNode;
  }

  // The unit is appended whether or not a custom formatter is given, so a
  // tooltip never shows a bare number while the axis and table show the unit.
  const formatted = formatChartNumber(value, formatter);
  return unit ? `${formatted} ${unit}` : formatted;
};

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Builds a tick formatter that shortens date-like labels (`2026-03-10` -> `10
 * Mar`) using the browser locale, and leaves category labels untouched, so both
 * time series and categorical axes are legible.
 */
const useDefaultTickFormatter = (): ((value: unknown) => string) => {
  const { short } = useDateFormatters();

  return React.useCallback(
    (value: unknown): string => {
      const text = String(value ?? "");

      if (!DATE_LIKE.test(text)) {
        return text;
      }

      return short(text);
    },
    [short],
  );
};

/**
 * Formats a numeric axis tick, appending the series unit so a reader never has
 * to infer whether the axis is days, hours, minutes or percent.
 */
const numericTickFormatter =
  (unit?: string) =>
  (value: unknown): string => {
    const numeric = Number(value);
    const text = Number.isFinite(numeric)
      ? formatChartNumber(numeric)
      : String(value ?? "");

    return unit ? `${text} ${unit}` : text;
  };

/**
 * Series palettes are theme-aware and live in `@/lib/chart-theme`; components
 * read them through `useSeriesColors()` / `useChartChrome()` so a theme switch
 * repaints the marks along with the rest of the surface.
 */

interface ChartWrapperProps {
  ariaLabel?: string;
  /** Short note under the title, e.g. the time bucket a series uses. */
  caption?: string;
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
  /** Short note under the title, e.g. the time bucket a series uses. */
  caption?: string;
  className?: string;
  data: Record<string, unknown>[];
  layout?: "horizontal" | "vertical";
  /** Keeps only the top N rows after sorting, for ranked charts. */
  maxItems?: number;
  referenceLines?: readonly ChartReferenceLine[];
  /** Sorts rows by this key before rendering; defaults to largest first. */
  sortDirection?: "asc" | "desc";
  sortKey?: string;
  targetBand?: ChartTargetBand;
  title: string;
  tooltip?: string;
  tooltipFormatter?: (value: number) => string;
  /** Unit of the value axis (e.g. "days"), shown on ticks and in the tooltip. */
  unit?: string;
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
  /** Width reserved for the category axis in the vertical layout. */
  yAxisWidth?: number;
}

// --- Line Chart ---
interface SimpleLineChartProps {
  ariaLabel?: string;
  /** Short note under the title, e.g. the time bucket a series uses. */
  caption?: string;
  className?: string;
  data: Record<string, unknown>[];
  lines: { color?: string; key: string; name: string }[];
  referenceLines?: readonly ChartReferenceLine[];
  targetBand?: ChartTargetBand;
  title: string;
  tooltip?: string;
  tooltipFormatter?: (value: number) => string;
  /** Unit of the value axis (e.g. "days"), shown on ticks and in the tooltip. */
  unit?: string;
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
  /** When true (default) the y-axis starts at zero. */
  zeroBaseline?: boolean;
}

// --- Pie Chart ---
interface SimplePieChartProps {
  /** Short note under the title, e.g. the time bucket a series uses. */
  caption?: string;
  className?: string;
  data: { name: string; value: number }[];
  title: string;
  tooltip?: string;
}

export function ChartWrapper({
  ariaLabel,
  caption,
  children,
  className = "",
  footer,
  isEmpty = false,
  title,
  tooltip,
}: ChartWrapperProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-muted-foreground/50 ${className}`}
    >
      <div className="mb-6 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h3>
        {tooltip && <TooltipIcon content={tooltip} label={title} />}
        {caption && (
          <span className="ml-auto text-xs font-normal normal-case tracking-normal text-subtle-foreground">
            {caption}
          </span>
        )}
      </div>
      {isEmpty ? (
        <div className="flex h-72 items-center justify-center text-center text-sm text-muted-foreground">
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
  unit,
  valueFormatter,
  xKey,
  xValueFormatter,
}: {
  chartTitle: string;
  data: Record<string, unknown>[];
  series: readonly { key: string; name: string }[];
  unit?: string;
  valueFormatter?: (value: number) => string;
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
}) {
  return (
    <div className="custom-scrollbar mt-4 max-h-64 overflow-auto">
      <table aria-label={`${chartTitle} data`} className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th
              className="px-3 py-2 text-left font-semibold text-muted-foreground"
              scope="col"
            >
              {xKey}
            </th>
            {series.map((entry) => (
              <th
                className="px-3 py-2 text-left font-semibold text-muted-foreground"
                key={entry.key}
                scope="col"
              >
                {entry.name}
                {unit && (
                  <span className="ml-1 font-normal text-subtle-foreground">
                    ({unit})
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr className="border-b border-border-subtle" key={index}>
              <td className="px-3 py-1.5 text-foreground">
                {xValueFormatter
                  ? xValueFormatter(row[xKey])
                  : String(row[xKey] ?? "")}
              </td>
              {series.map((entry) => (
                <td className="px-3 py-1.5 text-foreground" key={entry.key}>
                  {formatSeriesValue(row[entry.key], valueFormatter, unit)}
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
  unit,
  valueFormatter,
  xKey,
  xValueFormatter,
}: {
  chartTitle: string;
  data: Record<string, unknown>[];
  series: readonly { key: string; name: string }[];
  unit?: string;
  valueFormatter?: (value: number) => string;
  xKey: string;
  xValueFormatter?: (value: unknown) => string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const regionId = React.useId();

  const handleDownload = () => {
    const blob = new Blob(
      [buildChartCsv(data, series, xKey, valueFormatter, unit)],
      {
        type: "text/csv;charset=utf-8;",
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.download = csvFileName(chartTitle);
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="mt-3 flex items-center gap-4">
        <button
          aria-controls={regionId}
          aria-expanded={isOpen}
          className={`rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          {isOpen ? "Hide data" : "Show data"}
        </button>
        <button
          className={`rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
          onClick={handleDownload}
          type="button"
        >
          Download CSV
        </button>
      </div>
      <div id={regionId}>
        {isOpen && (
          <ChartDataTable
            chartTitle={chartTitle}
            data={data}
            series={series}
            unit={unit}
            valueFormatter={valueFormatter}
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
      className={`rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-muted-foreground/50 ${className}`}
    >
      <div className="mb-6 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h3>
        {tooltip && <TooltipIcon content={tooltip} label={title} />}
      </div>
      <div className="custom-scrollbar max-h-96 overflow-auto">
        <table aria-label={title} className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border">
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
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground"
                    key={col.key}
                    scope="col"
                  >
                    <button
                      className={`inline-flex items-center gap-1 rounded transition-colors hover:text-foreground ${focusRing}`}
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
                className="group border-b border-border-subtle transition-colors hover:bg-subtle"
                key={i}
              >
                {columns.map((col) => (
                  <td
                    className="px-4 py-3 font-medium text-foreground"
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
  caption,
  className,
  data,
  layout = "horizontal",
  maxItems,
  referenceLines,
  sortDirection = "desc",
  sortKey,
  targetBand,
  title,
  tooltip,
  tooltipFormatter,
  unit,
  xKey,
  xValueFormatter,
  yAxisWidth = 120,
}: SimpleBarChartProps) {
  const isVertical = layout === "vertical";
  const defaultTickFormatter = useDefaultTickFormatter();
  const colors = useSeriesColors();
  const chrome = useChartChrome();

  // Ranked charts (e.g. Pareto of failures) need magnitudes, not the
  // alphabetical order the SQL returns; the same order feeds table and CSV.
  const chartData = React.useMemo(
    () => sortChartData(data, sortKey, sortDirection, maxItems),
    [data, sortKey, sortDirection, maxItems],
  );

  return (
    <ChartWrapper
      ariaLabel={ariaLabel}
      caption={caption}
      className={className}
      footer={
        <ChartDataToggle
          chartTitle={title}
          data={chartData}
          series={bars.map((bar) => ({ key: bar.key, name: bar.name }))}
          unit={unit}
          valueFormatter={tooltipFormatter}
          xKey={xKey}
          xValueFormatter={xValueFormatter}
        />
      }
      isEmpty={chartData.length === 0}
      title={title}
      tooltip={tooltip}
    >
      <BarChart
        data={chartData}
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
          stroke={chrome.grid}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey={isVertical ? undefined : xKey}
          stroke={chrome.axis}
          tick={{
            fill: chrome.tick,
            fontSize: 11,
            ...(isVertical
              ? {}
              : {
                  textAnchor: chartData.length > 4 ? "end" : "middle",
                }),
          }}
          tickFormatter={
            isVertical
              ? (xValueFormatter ?? numericTickFormatter(unit))
              : (xValueFormatter ?? defaultTickFormatter)
          }
          type={isVertical ? "number" : "category"}
          {...(isVertical
            ? { domain: [0, (max: number) => Math.ceil(max * 1.1)] }
            : {
                angle: chartData.length > 4 ? -45 : 0,
                height: chartData.length > 4 ? 80 : 30,
                interval: Math.max(0, Math.floor(chartData.length / 8) - 1),
                tickMargin: chartData.length > 4 ? 15 : 0,
              })}
        />
        <YAxis
          dataKey={isVertical ? xKey : undefined}
          stroke={chrome.axis}
          tick={{ fill: chrome.tick, fontSize: 11 }}
          tickFormatter={isVertical ? undefined : numericTickFormatter(unit)}
          type={isVertical ? "category" : "number"}
          {...(isVertical
            ? { width: yAxisWidth }
            : { domain: [0, (max: number) => Math.ceil(max * 1.1)] })}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: chrome.tooltipBackground,
            border: `1px solid ${chrome.tooltipBorder}`,
            borderRadius: "8px",
            color: chrome.tooltipText,
          }}
          formatter={(value) =>
            formatTooltipValue(value, tooltipFormatter, unit)
          }
          itemStyle={{ color: chrome.tooltipText }}
        />
        <Legend
          wrapperStyle={{
            color: chrome.legend,
            fontSize: "12px",
            paddingTop: "20px",
          }}
        />
        {targetBand &&
          (isVertical ? (
            <ReferenceArea
              fill={colors.green}
              fillOpacity={0.08}
              ifOverflow="extendDomain"
              key="target-band"
              x1={targetBand.from}
              x2={targetBand.to}
            />
          ) : (
            <ReferenceArea
              fill={colors.green}
              fillOpacity={0.08}
              ifOverflow="extendDomain"
              key="target-band"
              y1={targetBand.from}
              y2={targetBand.to}
            />
          ))}
        {bars.map((bar, i) => (
          <Bar
            dataKey={bar.key}
            fill={bar.color ?? colors[SERIES_ORDER[i % SERIES_ORDER.length]]}
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
              stroke={line.color ?? colors.gray}
              strokeDasharray="4 4"
              x={line.value}
            />
          ) : (
            <ReferenceLine
              key={`ref-${line.label}`}
              label={line.label}
              stroke={line.color ?? colors.gray}
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
  caption,
  className,
  data,
  lines,
  referenceLines,
  targetBand,
  title,
  tooltip,
  tooltipFormatter,
  unit,
  xKey,
  xValueFormatter,
  zeroBaseline = true,
}: SimpleLineChartProps) {
  const defaultTickFormatter = useDefaultTickFormatter();
  const colors = useSeriesColors();
  const chrome = useChartChrome();

  return (
    <ChartWrapper
      ariaLabel={ariaLabel}
      caption={caption}
      className={className}
      footer={
        <ChartDataToggle
          chartTitle={title}
          data={data}
          series={lines.map((line) => ({ key: line.key, name: line.name }))}
          unit={unit}
          valueFormatter={tooltipFormatter}
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
          stroke={chrome.grid}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          angle={data.length > 6 ? -35 : 0}
          dataKey={xKey}
          height={data.length > 6 ? 70 : 30}
          interval={Math.max(0, Math.floor(data.length / 8) - 1)}
          stroke={chrome.axis}
          tick={{
            fill: chrome.tick,
            fontSize: 11,
            textAnchor: data.length > 6 ? "end" : "middle",
          }}
          tickFormatter={xValueFormatter ?? defaultTickFormatter}
          tickMargin={data.length > 6 ? 15 : 0}
        />
        <YAxis
          domain={zeroBaseline ? [0, "auto"] : ["auto", "auto"]}
          stroke={chrome.axis}
          tick={{ fill: chrome.tick, fontSize: 11 }}
          tickFormatter={numericTickFormatter(unit)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: chrome.tooltipBackground,
            border: `1px solid ${chrome.tooltipBorder}`,
            borderRadius: "8px",
            color: chrome.tooltipText,
          }}
          formatter={(value) =>
            formatTooltipValue(value, tooltipFormatter, unit)
          }
          itemStyle={{ color: chrome.tooltipText }}
        />
        <Legend
          wrapperStyle={{
            color: chrome.legend,
            fontSize: "12px",
            paddingTop: "10px",
          }}
        />
        {targetBand && (
          <ReferenceArea
            fill={colors.green}
            fillOpacity={0.08}
            ifOverflow="extendDomain"
            y1={targetBand.from}
            y2={targetBand.to}
          />
        )}
        {lines.map((line, i) => (
          <Line
            dataKey={line.key}
            dot={false}
            isAnimationActive={false}
            key={line.key}
            name={line.name}
            stroke={line.color ?? colors[SERIES_ORDER[i % SERIES_ORDER.length]]}
            strokeWidth={2}
            type="linear"
          />
        ))}
        {referenceLines?.map((line) => (
          <ReferenceLine
            key={`ref-${line.label}`}
            label={line.label}
            stroke={line.color ?? colors.gray}
            strokeDasharray="4 4"
            y={line.value}
          />
        ))}
      </LineChart>
    </ChartWrapper>
  );
}

export function SimplePieChart({
  caption,
  className,
  data,
  title,
  tooltip,
}: SimplePieChartProps) {
  const total = data.reduce((sum, entry) => sum + Number(entry.value), 0);
  const colors = useSeriesColors();
  const chrome = useChartChrome();

  return (
    <ChartWrapper
      caption={caption}
      className={className}
      footer={
        <ChartDataToggle
          chartTitle={title}
          data={data.map((entry) => ({ ...entry }))}
          series={[{ key: "value", name: "Count" }]}
          xKey="name"
        />
      }
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
              value,
            }: {
              name?: number | string;
              percent?: number;
              value?: number;
            }) =>
              `${name} — ${formatChartNumber(Number(value ?? 0))} (${((percent || 0) * 100).toFixed(0)}%)`
            }
            labelLine
            outerRadius={80}
          >
            {data.map((entry, index) => (
              <Cell
                fill={colors[PIE_ORDER[index % PIE_ORDER.length]]}
                key={`cell-${index}`}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: chrome.tooltipBackground,
              border: `1px solid ${chrome.tooltipBorder}`,
              borderRadius: "8px",
              color: chrome.tooltipText,
            }}
            formatter={(value) => {
              if (typeof value === "number") {
                return `${formatChartNumber(value)} (${total > 0 ? ((value / total) * 100).toFixed(0) : 0}%)`;
              }
              return value;
            }}
            itemStyle={{ color: chrome.tooltipText }}
          />
          <Legend wrapperStyle={{ color: chrome.legend, fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
