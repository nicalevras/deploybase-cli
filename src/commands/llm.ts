import { defineCommand } from "citty";
import ora from "ora";
import { fetchModels } from "../client.js";
import type { LLM } from "../types.js";
import {
  formatTokenPrice,
  formatContext,
  formatValue,
  renderTable,
  renderSummary,
  renderEmpty,
  renderError,
} from "../formatter.js";

export default defineCommand({
  meta: {
    name: "llm",
    description: "Search and compare LLM models across providers",
  },
  args: {
    provider: {
      type: "string",
      description: "Filter by provider(s), comma-separated (e.g. openai,anthropic)",
    },
    author: {
      type: "string",
      description: "Filter by author(s), comma-separated (e.g. meta,google)",
    },
    modality: {
      type: "string",
      description: "Filter by modality (e.g. text,image)",
    },
    "input-price-max": {
      type: "string",
      description: "Maximum input price per token",
    },
    "output-price-max": {
      type: "string",
      description: "Maximum output price per token",
    },
    search: {
      type: "string",
      description: "Full-text search",
    },
    sort: {
      type: "string",
      description: "Sort field.direction (e.g. promptPrice.asc)",
      default: "promptPrice.asc",
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
    const spinner = ora("Fetching LLM models...").start();

    try {
      // Build price slider params
      let inputPriceParam: string | undefined;
      if (args["input-price-max"]) {
        inputPriceParam = `-${args["input-price-max"]}`;
      }

      let outputPriceParam: string | undefined;
      if (args["output-price-max"]) {
        outputPriceParam = `-${args["output-price-max"]}`;
      }

      const result = await fetchModels({
        provider: args.provider,
        author: args.author,
        modalities: args.modality,
        inputPrice: inputPriceParam,
        outputPrice: outputPriceParam,
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
        { value: "Model", width: 28 },
        { value: "Author", width: 12 },
        { value: "Context", width: 9, align: "right" as const },
        { value: "Input $/1M", width: 12, align: "right" as const },
        { value: "Output $/1M", width: 12, align: "right" as const },
        { value: "Modalities", width: 16 },
      ];

      const rows = result.data.map((row: LLM) => [
        formatValue(row.provider),
        formatValue(row.name || row.shortName),
        formatValue(row.author),
        formatContext(row.contextLength),
        formatTokenPrice(row.promptPrice),
        formatTokenPrice(row.completionPrice),
        row.inputModalities?.length
          ? row.inputModalities.join(", ")
          : "—",
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
