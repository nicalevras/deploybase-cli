#!/usr/bin/env node

import { createRequire } from "node:module";
import { startRepl } from "./repl.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const argv = process.argv.slice(2);

// Handle --version
if (argv.includes("--version") || argv.includes("-v")) {
  console.log(pkg.version);
  process.exit(0);
}

// Extract --base-url value
let baseUrl: string | undefined;
const rest: string[] = [];

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--base-url" && i + 1 < argv.length) {
    const val = argv[i + 1];
    if (val.startsWith("--")) {
      console.error("Error: --base-url requires a URL value");
      process.exit(1);
    }
    baseUrl = val;
    i++;
  } else if (argv[i].startsWith("--base-url=")) {
    const val = argv[i].substring(argv[i].indexOf("=") + 1);
    if (!val) {
      console.error("Error: --base-url requires a URL value");
      process.exit(1);
    }
    baseUrl = val;
  } else {
    rest.push(argv[i]);
  }
}

const initialCommand = rest.length > 0 ? rest.join(" ") : undefined;

startRepl(baseUrl, initialCommand);
