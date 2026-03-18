import { defineCommand } from "citty";
import chalk from "chalk";
import ora from "ora";
import { fetchModels, fetchLlmFacets } from "../client.js";
import type { LLM } from "../types.js";
import {
  phosphor,
  bouncingBar,
  formatProvider,
  formatTokenPrice,
  formatContext,
  formatValue,
  resolveLlmProvider,
  resolveLlmAuthor,
  setLlmProviders,
  setLlmAuthors,
  renderTable,
  renderSummary,
  renderEmpty,
  renderError,
} from "../formatter.js";

const MODALITY_LABEL: Record<string, string> = {
  text: "Text",
  file: "File",
  image: "Image",
  audio: "Audio",
  video: "Video",
  embeddings: "Embed",
};

function formatModalities(input: string[] | undefined, output: string[] | undefined): string {
  const combined = [...new Set([...(input || []), ...(output || [])])];
  if (!combined.length) return "—";
  return combined
    .map((m) => MODALITY_LABEL[m.toLowerCase()] || m)
    .join(", ");
}

export default defineCommand({
  meta: {
    name: "llm",
    description: "Search and compare LLM models across providers",
  },
  args: {
    provider: {
      type: "string",
      description: "Filter by provider (e.g. openai, anthropic)",
    },
    author: {
      type: "string",
      description: "Filter by author (e.g. meta, google)",
    },
    modality: {
      type: "string",
      description: "Filter by modality (e.g. text, image)",
    },
    search: {
      type: "string",
      description: "Full-text search",
    },
  },
  async run({ args }) {
    const spinner = ora({ text: phosphor("Fetching LLM models..."), spinner: bouncingBar, discardStdin: false }).start();

    try {
      // Resolve case-insensitive provider/author input against known API values
      let resolvedProvider = args.provider;
      let resolvedAuthor = args.author;
      if (args.provider || args.author) {
        const facets = await fetchLlmFacets();
        setLlmProviders(facets.providers);
        setLlmAuthors(facets.authors);
        if (args.provider) resolvedProvider = resolveLlmProvider(args.provider);
        if (args.author) resolvedAuthor = resolveLlmAuthor(args.author);
      }

      const normalizedModalities = args.modality
        ? args.modality
            .split(",")
            .map((m) => m.trim().charAt(0).toUpperCase() + m.trim().slice(1).toLowerCase())
        : undefined;

      const result = await fetchModels({
        provider: resolvedProvider,
        author: resolvedAuthor,
        modalities: normalizedModalities?.join(","),
        modalityDirections: normalizedModalities
          ?.flatMap((m) =>
            m.toLowerCase() === "embeddings"
              ? [`${m}:output`]
              : [`${m}:input`, `${m}:output`]
          )
          .join(","),
        search: args.search,
        sort: "promptPrice.asc",
      });

      spinner.stop();

      if (result.data.length === 0) {
        console.log(renderEmpty());
        return;
      }

      const columns = [
        { value: "Provider", width: 16 },
        { value: "Model", width: 20 },
        { value: "Author", width: 10 },
        { value: "Context", width: 10, align: "center" as const },
        { value: "Input $", width: 10, align: "center" as const },
        { value: "Output $", width: 10, align: "center" as const },
        { value: "Throughput", alias: "TPS", width: 8, align: "center" as const },
        { value: "Modalities", width: 12 },
      ];

      const rows = result.data.map((row: LLM) => [
        formatProvider(row.provider),
        formatValue(row.shortName || row.name),
        formatValue(row.author),
        formatContext(row.contextLength),
        formatTokenPrice(row.promptPrice),
        formatTokenPrice(row.completionPrice),
        row.throughput != null ? row.throughput.toFixed(1) : chalk.dim("—"),
        formatModalities(row.inputModalities, row.outputModalities),
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
