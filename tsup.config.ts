import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/lib/render-server.ts"],
  format: ["cjs"],
  outDir: "dist",
  platform: "node",
  target: "node20",
  sourcemap: false,
  dts: false,
  noExternal: ["@polymarket/clob-client"],
});
