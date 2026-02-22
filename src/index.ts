#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { getBaseUrl, setBaseUrl } from "./client.js";
import gpu from "./commands/gpu.js";
import llm from "./commands/llm.js";
import tools from "./commands/tools.js";

const main = defineCommand({
  meta: {
    name: "deploybase",
    version: "0.1.0",
    description:
      "Compare GPU pricing, LLM models, and MLops tools from your terminal",
  },
  args: {
    "base-url": {
      type: "string",
      description: "Override API base URL (or set DEPLOYBASE_API_URL env var)",
    },
  },
  setup({ args }) {
    const url = getBaseUrl(args["base-url"]);
    setBaseUrl(url);
  },
  subCommands: {
    gpu,
    llm,
    tools,
  },
});

runMain(main);
