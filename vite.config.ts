import fs from "node:fs";
import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/** Wrangler-style `.dev.vars` (same file as Worker secrets). */
function parseDevVars(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const text = fs.readFileSync(filePath, "utf8");
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export default defineConfig(({ mode }) => {
  const devVars = parseDevVars(path.resolve(process.cwd(), ".dev.vars"));
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const placesKey =
    env.VITE_GOOGLE_PLACES_API_KEY?.trim() ||
    devVars.VITE_GOOGLE_PLACES_API_KEY?.trim() ||
    "";

  return {
    plugins: [cloudflare(), react(), tailwindcss()],
    define: {
      "import.meta.env.VITE_GOOGLE_PLACES_API_KEY": JSON.stringify(placesKey),
    },
  };
});
