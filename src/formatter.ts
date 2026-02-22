import chalk from "chalk";
import Table from "tty-table";

// ── Price Formatting ─────────────────────────────────────────────────

export function formatPrice(value: number | null | undefined, suffix = "/hr"): string {
  if (value === null || value === undefined) return chalk.dim("—");
  const formatted = `$${value.toFixed(2)}${suffix}`;
  if (value === 0) return chalk.green(formatted);
  if (value < 1) return chalk.green(formatted);
  if (value < 3) return chalk.yellow(formatted);
  return chalk.red(formatted);
}

export function formatTokenPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return chalk.dim("—");
  const perMillion = value * 1_000_000;
  const formatted = `$${perMillion.toFixed(2)}/1M`;
  if (perMillion < 1) return chalk.green(formatted);
  if (perMillion < 10) return chalk.yellow(formatted);
  return chalk.red(formatted);
}

// ── Value Formatting ─────────────────────────────────────────────────

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return chalk.dim("—");
  const num = typeof value === "string" ? parseInt(value, 10) : value;
  if (isNaN(num)) return chalk.dim("—");
  return num.toLocaleString();
}

export function formatVram(value: number | null | undefined): string {
  if (value === null || value === undefined) return chalk.dim("—");
  return `${value} GB`;
}

export function formatContext(value: number | null | undefined): string {
  if (value === null || value === undefined) return chalk.dim("—");
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export function formatValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "undefined" || value === "null") {
    return chalk.dim("—");
  }
  return value;
}

// ── Table Rendering ──────────────────────────────────────────────────

interface Column {
  value: string;
  alias?: string;
  align?: "left" | "center" | "right";
  width?: number;
  formatter?: (value: string) => string;
}

export function renderTable(columns: Column[], rows: string[][]): string {
  const header = columns.map((col) => ({
    value: col.alias || col.value,
    align: col.align || "left",
    width: col.width,
    headerAlign: "left",
    headerColor: "cyan",
    color: "white",
    formatter: col.formatter,
  }));

  // tty-table types are incomplete — use any to avoid false positives
  const t = (Table as any)(header, rows, {
    borderStyle: "solid",
    borderColor: "gray",
    paddingLeft: 1,
    paddingRight: 1,
    defaultValue: chalk.dim("—"),
  });

  return t.render();
}

// ── Summary ──────────────────────────────────────────────────────────

export function renderSummary(showing: number, filtered: number, total: number): string {
  const parts = [
    chalk.bold.white(`${showing}`),
    chalk.dim(` of `),
    chalk.bold.white(`${filtered.toLocaleString()}`),
    chalk.dim(` results`),
  ];
  if (filtered !== total) {
    parts.push(chalk.dim(` (${total.toLocaleString()} total)`));
  }
  return `\n  ${parts.join("")}\n`;
}

export function renderEmpty(): string {
  return `\n  ${chalk.yellow("No results found.")} ${chalk.dim("Try broadening your filters.")}\n`;
}

export function renderError(message: string): string {
  return `\n  ${chalk.red("Error:")} ${message}\n`;
}
