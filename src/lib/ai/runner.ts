import { generateText, tool } from "ai";
import type { z } from "zod";

import { AnalysisError } from "./errors";
import { buildStagePrompt, buildStageSystem, type AiStageKey } from "./prompt";
import { resolveModel, type AiSettings } from "./provider";
import { STAGES, STAGE_SCHEMAS, assembleAnalysis, taskLines, validateStageOutput, type StageData } from "./stages";
import type { Analysis } from "./schema";

const AI_STAGES: AiStageKey[] = ["extract", "breakdown", "complexity", "dependencies"];

const stageTitle = (stage: AiStageKey) => STAGES.find((s) => s.key === stage)!.title;

/**
 * Jalankan SATU tahap AI. Structured output lewat tool call terpaksa, bukan `response_format: json_schema`:
 * tool calling didukung luas (OpenAI, endpoint OpenAI-compatible, Ollama), sedangkan json_schema banyak
 * diabaikan gateway pihak ketiga (§5 vendor lock-in). Satu auto-retry sebelum menyerah (§5); jangan pernah
 * lanjut dengan harga palsu kalau tetap gagal.
 */
export async function runAiStage(
  stage: AiStageKey,
  requirement: string,
  data: StageData,
  settings: AiSettings,
): Promise<unknown> {
  const model = resolveModel(settings);
  const toolName = `submit_${stage}`;

  const attempt = async () => {
    const result = await generateText({
      model,
      temperature: settings.temperature,
      system: buildStageSystem(stage, settings.systemPrompt),
      prompt: buildStagePrompt(stage, requirement, taskLines(data)),
      tools: {
        [toolName]: tool({
          description: `Kirimkan hasil tahap "${stageTitle(stage)}" dalam format terstruktur.`,
          // Union skema per tahap tidak dipersempit oleh TS; bentuk sebenarnya divalidasi di validateStageOutput.
          inputSchema: STAGE_SCHEMAS[stage] as z.ZodType<unknown>,
        }),
      },
      toolChoice: { type: "tool", toolName },
    });

    const call = result.toolCalls.at(0);
    if (!call) throw new Error(`model tidak memanggil tool ${toolName}`);

    // Validasi ulang (bentuk + cakupan semua task) — jangan percaya begitu saja pada input tool.
    return validateStageOutput(stage, call.input, data);
  };

  try {
    return await attempt();
  } catch {
    try {
      return await attempt();
    } catch (error) {
      throw new AnalysisError(
        `Tahap "${stageTitle(stage)}" gagal: ${error instanceof Error ? error.message : "penyebab tidak diketahui"}`,
      );
    }
  }
}

/** Seluruh tahap AI berurutan dalam memori (tanpa DB) — dipakai script eval offline. */
export async function generateAnalysisWith(requirement: string, settings: AiSettings): Promise<Analysis> {
  const data: StageData = {};
  for (const stage of AI_STAGES) {
    (data as Record<string, unknown>)[stage] = await runAiStage(stage, requirement, data, settings);
  }
  return assembleAnalysis(data);
}
