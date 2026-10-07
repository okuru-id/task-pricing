/**
 * Probe manual provider AI: `npx tsx --env-file=.env scripts/probe-ai.mts --workspace=<id>`
 * Konfigurasi dibaca dari database (Settings workspace), bukan dari environment variable.
 */
import { generateText, tool } from "ai";
import { z } from "zod";

import { requireAiSettings, resolveModel } from "../src/lib/ai/provider";

const workspaceId = process.argv.find((arg) => arg.startsWith("--workspace="))?.split("=")[1];
if (!workspaceId) {
  console.error("Wajib: --workspace=<id workspace>");
  process.exit(2);
}

const model = resolveModel(await requireAiSettings(workspaceId));

const result = await generateText({
  model,
  prompt: "Sebutkan 2 task untuk membuat halaman login. Kirim lewat tool submit.",
  tools: {
    submit: tool({
      description: "Kirim hasil",
      inputSchema: z.object({ tasks: z.array(z.string()) }),
    }),
  },
  toolChoice: { type: "tool", toolName: "submit" },
});

console.log("toolCalls:", JSON.stringify(result.toolCalls, null, 1));
console.log("text:", result.text.slice(0, 200));
