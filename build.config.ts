import { defineBuildConfig } from "unbuild";
import { config } from "dotenv";

config();

export default defineBuildConfig({
  entries: ["src/index"],
  rollup: {
    emitCJS: false,
    inlineDependencies: true,
  },
  declaration: false,
  replace: {
    "process.env.DEPLOYBASE_API_URL": JSON.stringify(process.env.DEPLOYBASE_API_URL || "https://deploybase.ai"),
  },
});
