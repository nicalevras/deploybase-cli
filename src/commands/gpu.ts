import { defineCommand } from "citty";
import ora from "ora";
import { fetchGPUs } from "../client.js";
import type { GPU } from "../types.js";
import {
  formatPrice,
  formatVram,
  formatNumber,
  formatValue,
  renderTable,
  renderSummary,
  renderEmpty,
  renderError,
} from "../formatter.js";

export default defineCommand({
  meta: {
    name: "gpu",
    description: "Search and compare GPU pricing across cloud providers",
  },
  args: {
    provider: {
      type: "string",
      description: "Filter by provider(s), comma-separated (e.g. coreweave,lambda)",
    },
    gpu: {
      type: "string",
      description: "Filter by GPU model(s), comma-separated (e.g. H100,A100)",
    },
    type: {
      type: "string",
      description: "Filter by type (VM, Bare Metal)",
    },
    "vram-min": {
      type: "string",
      description: "Minimum VRAM in GB",
    },
    "vram-max": {
      type: "string",
      description: "Maximum VRAM in GB",
    },
    "price-max": {
      type: "string",
      description: "Maximum price per hour in USD",
    },
    search: {
      type: "string",
      description: "Full-text search",
    },
    sort: {
      type: "string",
      description: "Sort field.direction (e.g. price_hour_usd.asc)",
      default: "price_hour_usd.asc",
    },
    limit: {
      type: "string",
      description: "Number of results to show",
      default: "25",
    },
    all: {
      type: "boolean",
      description: "Fetch all pages of results",
      default: false,
    },
    json: {
      type: "boolean",
      description: "Output raw JSON",
      default: false,
    },
  },
  async run({ args }) {
    const spinner = ora("Fetching GPU pricing...").start();

    try {
      // Build vram_gb slider param (min-max)
      let vramParam: string | undefined;
      if (args["vram-min"] || args["vram-max"]) {
        const min = args["vram-min"] || "";
        const max = args["vram-max"] || "";
        vramParam = `${min}-${max}`;
      }

      // Build price slider param
      let priceParam: string | undefined;
      if (args["price-max"]) {
        priceParam = `-${args["price-max"]}`;
      }

      const result = await fetchGPUs({
        provider: args.provider?.replace(/,/g, ","),
        gpu_model: args.gpu?.replace(/,/g, ","),
        type: args.type,
        vram_gb: vramParam,
        price_hour_usd: priceParam,
        search: args.search,
        sort: args.sort,
        size: parseInt(args.limit, 10),
        all: args.all,
      });

      spinner.stop();

      if (result.data.length === 0) {
        console.log(renderEmpty());
        return;
      }

      if (args.json) {
        console.log(JSON.stringify(result.data, null, 2));
        return;
      }

      const columns = [
        { value: "Provider", width: 14 },
        { value: "GPU", width: 12 },
        { value: "Cnt", width: 5, align: "right" as const },
        { value: "VRAM", width: 8, align: "right" as const },
        { value: "vCPUs", width: 7, align: "right" as const },
        { value: "RAM", width: 8, align: "right" as const },
        { value: "$/hr", width: 10, align: "right" as const },
        { value: "Type", width: 12 },
      ];

      const rows = result.data.map((row: GPU) => [
        formatValue(row.provider),
        formatValue(row.gpu_model),
        formatNumber(row.gpu_count),
        formatVram(row.vram_gb),
        formatNumber(row.vcpus),
        row.system_ram_gb ? `${row.system_ram_gb} GB` : "—",
        formatPrice(row.price_hour_usd),
        formatValue(row.type),
      ]);

      console.log(renderTable(columns, rows));
      console.log(renderSummary(result.data.length, result.filtered, result.total));
    } catch (error) {
      spinner.stop();
      const message = error instanceof Error ? error.message : String(error);
      console.error(renderError(message));
      process.exit(1);
    }
  },
});
