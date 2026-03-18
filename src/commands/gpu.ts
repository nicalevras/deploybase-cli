import { defineCommand } from "citty";
import chalk from "chalk";
import ora from "ora";
import { fetchGPUs } from "../client.js";
import type { GPU } from "../types.js";
import {
  phosphor,
  bouncingBar,
  formatProvider,
  formatPrice,
  formatVram,
  formatNumber,
  formatValue,
  resolveGpuProvider,
  resolveGpuType,
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
      description: "Filter by provider (e.g. lambda, coreweave)",
    },
    model: {
      type: "string",
      description: "Filter by GPU model (e.g. H100, A100)",
    },
    type: {
      type: "string",
      description: "Filter by type (VM, Bare Metal)",
    },
    search: {
      type: "string",
      description: "Full-text search",
    },
  },
  async run({ args }) {
    const spinner = ora({ text: phosphor("Fetching GPU pricing..."), spinner: bouncingBar, discardStdin: false }).start();

    try {
      const result = await fetchGPUs({
        provider: args.provider ? resolveGpuProvider(args.provider) : undefined,
        gpu_model: args.model,
        type: args.type ? resolveGpuType(args.type) : undefined,
        search: args.search,
        sort: "price_hour_usd.asc",
      });

      spinner.stop();

      if (result.data.length === 0) {
        console.log(renderEmpty());
        return;
      }

      const columns = [
        { value: "Provider", width: 16 },
        { value: "Model", width: 20 },
        { value: "GPUs", width: 10, align: "center" as const },
        { value: "VRAM", width: 10, align: "center" as const },
        { value: "vCPUs", width: 8, align: "center" as const },
        { value: "RAM", width: 10, align: "center" as const },
        { value: "Price", width: 12, align: "center" as const },
        { value: "Type", width: 10, align: "center" as const },
      ];

      const rows = result.data.map((row: GPU) => [
        formatProvider(row.provider),
        formatValue(row.gpu_model),
        formatNumber(row.gpu_count),
        formatVram(row.vram_gb),
        formatNumber(row.vcpus),
        row.system_ram_gb ? `${row.system_ram_gb} GB` : chalk.dim("—"),
        formatPrice(row.price_hour_usd),
        formatValue(row.type === "Virtual Machine" ? "VM" : row.type === "Bare Metal" ? "BM" : row.type),
      ]);

      console.log(renderTable(columns, rows));
      console.log(renderSummary(result.data.length, result.filtered, result.total));
    } catch (error) {
      spinner.stop();
      const message = error instanceof Error ? error.message : String(error);
      console.error(renderError(message));
      if (!process.env.__DEPLOYBASE_REPL) process.exit(1);
    }
  },
});
