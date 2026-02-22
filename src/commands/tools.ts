import { defineCommand } from "citty";
import ora from "ora";
import { fetchTools } from "../client.js";
import type { Tool } from "../types.js";
import {
  formatValue,
  renderTable,
  renderSummary,
  renderEmpty,
  renderError,
} from "../formatter.js";
import chalk from "chalk";

export default defineCommand({
  meta: {
    name: "tools",
    description: "Search and compare MLops tools",
  },
  args: {
    developer: {
      type: "string",
      description: "Filter by developer(s), comma-separated",
    },
    category: {
      type: "string",
      description: "Filter by category(s), comma-separated",
    },
    stack: {
      type: "string",
      description: "Filter by tech stack, comma-separated",
    },
    oss: {
      type: "string",
      description: "Filter by open source (true/false)",
    },
    search: {
      type: "string",
      description: "Full-text search",
    },
    sort: {
      type: "string",
      description: "Sort field.direction (e.g. name.asc)",
      default: "name.asc",
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
    const spinner = ora("Fetching MLops tools...").start();

    try {
      const result = await fetchTools({
        developer: args.developer,
        category: args.category,
        stack: args.stack,
        oss: args.oss,
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
        { value: "Name", width: 22 },
        { value: "Developer", width: 16 },
        { value: "Category", width: 16 },
        { value: "Stack", width: 14 },
        { value: "License", width: 14 },
        { value: "OSS", width: 6, align: "center" as const },
        { value: "Price", width: 12 },
      ];

      const rows = result.data.map((row: Tool) => [
        formatValue(row.name),
        formatValue(row.developer),
        formatValue(row.category),
        formatValue(row.stack),
        formatValue(row.license),
        row.oss === "true" || row.oss === "Yes"
          ? chalk.green("Yes")
          : row.oss === "false" || row.oss === "No"
            ? chalk.dim("No")
            : formatValue(row.oss),
        formatValue(row.price),
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
