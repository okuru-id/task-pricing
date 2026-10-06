/** Probe manual provider AI: `npx tsx scripts/probe-ai.ts` */
import { generateText, tool } from "ai";
import { z } from "zod";

import { resolveModel } from "../src/lib/ai/provider";

const model = resolveModel({
  provider: "openai",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0.2,
  systemPrompt: null,
});

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
