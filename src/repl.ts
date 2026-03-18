import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import chalk from "chalk";
import ora from "ora";
import { runCommand } from "citty";
import { renderBanner } from "./banner.js";
import { getBaseUrl, setBaseUrl, fetchGpuFacets, fetchLlmFacets } from "./client.js";
import { phosphor, bouncingBar, formatProvider, renderError } from "./formatter.js";
import gpu from "./commands/gpu.js";
import llm from "./commands/llm.js";

const commands: Record<string, ReturnType<typeof import("citty").defineCommand>> = { gpu, llm };


function showHelp() {
  console.log();
  console.log(phosphor("  Commands"));
  console.log(`    ${phosphor("gpu")}                Search and compare GPU pricing`);
  console.log(`    ${phosphor("gpu providers")}      List available GPU providers`);
  console.log(`    ${phosphor("gpu models")}         List available GPU models`);
  console.log();
  console.log(`    ${phosphor("llm")}                Search and compare LLM models`);
  console.log(`    ${phosphor("llm providers")}      List available LLM providers`);
  console.log(`    ${phosphor("llm authors")}        List available LLM authors`);
  console.log();
  console.log(`    ${phosphor("help")}               Show this help`);
  console.log(`    ${phosphor("exit")}               Exit the CLI`);
  console.log();
  console.log(phosphor("  GPU Flags"));
  console.log(`    ${phosphor("--provider")} ${chalk.dim("<name>")}   Filter by provider (e.g. Lambda, RunPod)`);
  console.log(`    ${phosphor("--model")} ${chalk.dim("<name>")}       Filter by GPU model (e.g. H100, A100)`);
  console.log(`    ${phosphor("--type")} ${chalk.dim("<type>")}       Filter by type (Virtual Machine, Bare Metal)`);
  console.log(`    ${phosphor("--search")} ${chalk.dim("<text>")}     Full-text search`);
  console.log();
  console.log(phosphor("  LLM Flags"));
  console.log(`    ${phosphor("--provider")} ${chalk.dim("<name>")}   Filter by provider (e.g. BaseTen, Groq)`);
  console.log(`    ${phosphor("--author")} ${chalk.dim("<name>")}     Filter by author (e.g. OpenAI, Anthropic)`);
  console.log(`    ${phosphor("--modality")} ${chalk.dim("<type>")}   Filter by modality (e.g. text, image)`);
  console.log(`    ${phosphor("--search")} ${chalk.dim("<text>")}     Full-text search`);
  console.log();
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (const ch of input) {
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  // Merge multi-word flag values: --provider Google Cloud → --provider "Google Cloud"
  // Consumes tokens after a --flag until the next --flag or end of input
  const merged: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].startsWith("--")) {
      merged.push(tokens[i]);
      // Collect all following non-flag tokens as the value
      const parts: string[] = [];
      while (i + 1 < tokens.length && !tokens[i + 1].startsWith("--")) {
        i++;
        parts.push(tokens[i]);
      }
      if (parts.length) merged.push(parts.join(" "));
    } else {
      merged.push(tokens[i]);
    }
  }

  return merged;
}

async function listFacetValues(
  values: string[],
  label: string,
  formatter?: (value: string) => string,
): Promise<void> {
  const sorted = [...values].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  console.log();
  console.log(chalk.bold(`  ${label} (${sorted.length}):`));
  console.log();
  for (const v of sorted) {
    console.log(`    ${phosphor(formatter ? formatter(v) : v)}`);
  }
  console.log();
}

async function runCmd(input: string): Promise<"continue" | "exit"> {
  const trimmed = input.trim();
  if (!trimmed) return "continue";

  if (trimmed === "exit" || trimmed === "quit") {
    return "exit";
  }

  if (trimmed === "help" || trimmed === "?") {
    showHelp();
    return "continue";
  }

  const tokens = tokenize(trimmed);
  const cmdName = tokens[0];
  const cmdArgs = tokens.slice(1);

  // Handle subcommands: gpu providers, gpu models, llm providers, llm authors
  if (cmdName === "gpu" && cmdArgs[0] === "providers") {
    const spinner = ora({ text: phosphor("Fetching GPU Providers..."), spinner: bouncingBar, discardStdin: false }).start();
    try {
      const facets = await fetchGpuFacets();
      spinner.stop();
      await listFacetValues(facets.providers, "GPU Providers", formatProvider);
    } catch (error) {
      spinner.stop();
      console.error(renderError(error instanceof Error ? error.message : String(error)));
    }
    return "continue";
  }
  if (cmdName === "gpu" && cmdArgs[0] === "models") {
    const spinner = ora({ text: phosphor("Fetching GPU Models..."), spinner: bouncingBar, discardStdin: false }).start();
    try {
      const facets = await fetchGpuFacets();
      spinner.stop();
      await listFacetValues(facets.gpuModels, "GPU Models");
    } catch (error) {
      spinner.stop();
      console.error(renderError(error instanceof Error ? error.message : String(error)));
    }
    return "continue";
  }
  if (cmdName === "llm" && cmdArgs[0] === "providers") {
    const spinner = ora({ text: phosphor("Fetching LLM Providers..."), spinner: bouncingBar, discardStdin: false }).start();
    try {
      const facets = await fetchLlmFacets();
      spinner.stop();
      await listFacetValues(facets.providers, "LLM Providers");
    } catch (error) {
      spinner.stop();
      console.error(renderError(error instanceof Error ? error.message : String(error)));
    }
    return "continue";
  }
  if (cmdName === "llm" && cmdArgs[0] === "authors") {
    const spinner = ora({ text: phosphor("Fetching LLM Authors..."), spinner: bouncingBar, discardStdin: false }).start();
    try {
      const facets = await fetchLlmFacets();
      spinner.stop();
      await listFacetValues(facets.authors, "LLM Authors");
    } catch (error) {
      spinner.stop();
      console.error(renderError(error instanceof Error ? error.message : String(error)));
    }
    return "continue";
  }

  const cmd = commands[cmdName];
  if (!cmd) {
    console.log(chalk.red(`  Unknown command: ${cmdName}`) + chalk.dim("  Type 'help' for available commands."));
    return "continue";
  }

  try {
    await runCommand(cmd, { rawArgs: cmdArgs });
  } catch {
    // errors already printed by the command handlers
  }
  return "continue";
}

export async function startRepl(baseUrlOverride?: string, initialCommand?: string) {
  process.env.__DEPLOYBASE_REPL = "1";

  const url = getBaseUrl(baseUrlOverride);
  setBaseUrl(url);

  console.log(renderBanner());
  showHelp();

  // Run initial command if passed via argv
  if (initialCommand) {
    const result = await runCmd(initialCommand);
    if (result === "exit") {
      process.exit(0);
    }
  }

  const rl = createInterface({ input: stdin, output: stdout });

  rl.on("close", () => {
    console.log();
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let line: string;
    try {
      line = await rl.question(phosphor("deploybase "));
    } catch {
      break;
    }

    const result = await runCmd(line);
    if (result === "exit") {
      rl.close();
      break;
    }
  }
}
