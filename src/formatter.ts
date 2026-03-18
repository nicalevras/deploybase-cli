import chalk from "chalk";
import CliTable3 from "cli-table3";

export const phosphor = chalk.hex("#00FF00");

// ── Spinner ─────────────────────────────────────────────────────────

export const bouncingBar = {
  interval: 80,
  frames: [
    "[    ]", "[=   ]", "[==  ]", "[=== ]", "[ ===]", "[  ==]",
    "[   =]", "[    ]", "[   =]", "[  ==]", "[ ===]", "[=== ]",
    "[==  ]", "[=   ]",
  ],
};

// ── Price Formatting ─────────────────────────────────────────────────

export function formatPrice(value: number | null | undefined, suffix = "/hr"): string {
  if (value === null || value === undefined) return chalk.dim("—");
  return phosphor(`$${value.toFixed(2)}`) + chalk.whiteBright(` ${suffix.toUpperCase()}`);
}

export function formatTokenPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return chalk.dim("—");
  const perMillion = value * 1_000_000;
  return phosphor(`$${perMillion.toFixed(2)}`) + chalk.whiteBright(` /1M`);
}

// ── Provider Formatting ──────────────────────────────────────────────

export const PROVIDER_NAMES: Record<string, string> = {
  runpod: "RunPod",
  lambda: "Lambda",
  coreweave: "CoreWeave",
  togetherai: "TogetherAI",
  voltagepark: "Voltage Park",
  hyperstack: "Hyperstack",
  replicate: "Replicate",
  crusoe: "Crusoe",
  nebius: "Nebius",
  paperspace: "Paperspace",
  koyeb: "Koyeb",
  thundercompute: "Thunder Compute",
  digitalocean: "DigitalOcean",
  vultr: "Vultr",
  scaleway: "Scaleway",
  civo: "Civo",
  latitude: "Latitude",
  ori: "Ori",
  aws: "AWS",
  googlecloud: "Google Cloud",
  azure: "Azure",
  oracle: "Oracle",
  alibaba: "Alibaba",
  verda: "Verda",
  vast: "Vast",
  oblivus: "Oblivus",
  sesterce: "Sesterce",
  hotaisle: "Hot Aisle",
};

export function formatProvider(value: string | null | undefined): string {
  if (!value) return chalk.dim("—");
  return PROVIDER_NAMES[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1);
}

// Build reverse lookup: "google cloud" → "googlecloud", "runpod" → "runpod", etc.
const REVERSE_GPU_PROVIDERS: Record<string, string> = {};
for (const [slug, display] of Object.entries(PROVIDER_NAMES)) {
  REVERSE_GPU_PROVIDERS[display.toLowerCase()] = slug;
  REVERSE_GPU_PROVIDERS[slug.toLowerCase()] = slug;
}

/**
 * Resolve user input to the API-expected provider value.
 * GPU providers are lowercase slugs, LLM providers are display-formatted.
 * Handles single values (comma-separated passthrough for API compatibility).
 */
export function resolveGpuProvider(input: string): string {
  return input
    .split(",")
    .map((v) => {
      const trimmed = v.trim().toLowerCase();
      return REVERSE_GPU_PROVIDERS[trimmed] || v.trim();
    })
    .join(",");
}

/**
 * Resolve GPU type input case-insensitively.
 * The API expects "Bare Metal" or "Virtual Machine".
 */
const GPU_TYPES: Record<string, string> = {
  "bare metal": "Bare Metal",
  "baremetal": "Bare Metal",
  "virtual machine": "Virtual Machine",
  "virtualmachine": "Virtual Machine",
  "vm": "Virtual Machine",
};

export function resolveGpuType(input: string): string {
  return input
    .split(",")
    .map((v) => {
      const trimmed = v.trim().toLowerCase();
      return GPU_TYPES[trimmed] || v.trim();
    })
    .join(",");
}

/**
 * Case-insensitive match for LLM providers/authors.
 * The API expects exact casing (e.g. "OpenAI", "Google AI Studio").
 * We cache known values on first fetch and match against them.
 */
let llmProviderCache: string[] = [];
let llmAuthorCache: string[] = [];

export function setLlmProviders(providers: string[]) {
  llmProviderCache = providers;
}

export function setLlmAuthors(authors: string[]) {
  llmAuthorCache = authors;
}

function resolveCaseInsensitive(input: string, known: string[]): string {
  const lower = input.trim().toLowerCase();
  return known.find((k) => k.toLowerCase() === lower) || input.trim();
}

export function resolveLlmProvider(input: string): string {
  return input
    .split(",")
    .map((v) => resolveCaseInsensitive(v, llmProviderCache))
    .join(",");
}

export function resolveLlmAuthor(input: string): string {
  return input
    .split(",")
    .map((v) => resolveCaseInsensitive(v, llmAuthorCache))
    .join(",");
}

// ── Value Formatting ─────────────────────────────────────────────────

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return chalk.dim("—");
  const num = typeof value === "string" ? Number(value) : value;
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

export function formatValue(value: string | null | undefined, uppercase = false): string {
  if (value === null || value === undefined || value === "undefined" || value === "null") {
    return chalk.dim("—");
  }
  return uppercase ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

// ── Table Rendering ──────────────────────────────────────────────────

interface Column {
  value: string;
  alias?: string;
  align?: "left" | "center" | "right";
  width?: number;

}

function scaleColumns(columns: Column[]): Column[] {
  const termWidth = process.stdout.columns || 120;
  const overhead = columns.length * 3 + 1;
  const totalBase = columns.reduce((sum, col) => sum + (col.width || 10), 0);
  const minWidth = totalBase + overhead;

  // Don't scale down if the terminal is too narrow — let it overflow
  if (termWidth < minWidth) return columns;

  const available = termWidth - overhead;
  if (available <= 0 || totalBase <= 0) return columns;

  const scale = available / totalBase;

  return columns.map((col) => ({
    ...col,
    width: Math.max(4, Math.round((col.width || 10) * scale)),
  }));
}

export function renderTable(columns: Column[], rows: string[][]): string {
  const scaled = scaleColumns(columns);

  const table = new CliTable3({
    head: scaled.map((col) => col.alias || col.value),
    colWidths: scaled.map((col) => (col.width || 10) + 2),
    colAligns: scaled.map((col) => col.align || "left"),
    wordWrap: false,
    style: {
      head: ["bold"],
      border: ["grey"],
    },
  });

  for (const row of rows) {
    table.push(row);
  }

  return table.toString();
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
  return `\n  ${chalk.red("No results found.")} ${chalk.dim("Try broadening your filters.")}\n`;
}

export function renderError(message: string): string {
  return `\n  ${chalk.red("Error:")} ${message}\n`;
}
