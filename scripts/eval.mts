/** Eval offline AI + release gate: `npm run eval` (lihat evals/README.md). */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { applyGuardrails, generateAnalysisWith } from "../src/lib/ai/analyze";
import type { AiSettings } from "../src/lib/ai/provider";
import {
  aggregate,
  checkGate,
  datasetProblems,
  scoreCase,
  type GoldenCase,
  type Report,
} from "../src/lib/eval/metrics";

const GOLDEN_DIR = "evals/golden";
const BASELINE = "evals/baseline.json";

const cases: GoldenCase[] = readdirSync(GOLDEN_DIR)
  .filter((file) => file.endsWith(".json"))
  .flatMap((file) => JSON.parse(readFileSync(join(GOLDEN_DIR, file), "utf8")) as GoldenCase[]);

const settings: AiSettings = {
  provider: "openai",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  temperature: 0.2,
  systemPrompt: null,
};

const scores = [];
for (const golden of cases) {
  try {
    const analysis = await generateAnalysisWith(golden.requirement, settings);
    const tasks = analysis.tasks.map(applyGuardrails).map((task) => ({
      name: task.name,
      reason: task.reason,
      breakdown: task.breakdown,
      complexity: task.complexity,
      flags: task.flags,
    }));
    scores.push(scoreCase(golden, tasks));
    console.log(`✓ ${golden.id}: ${tasks.length} task`);
  } catch (error) {
    scores.push(scoreCase(golden, null));
    console.log(`✗ ${golden.id}: ${error instanceof Error ? error.message : error}`);
  }
}

const report = aggregate(scores);
const baseline: Report | null = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null;

console.log(`\nModel: ${settings.model}\n`, report);

const failures = checkGate(report, baseline);
const problems = datasetProblems(cases);

if (process.argv.includes("--update-baseline")) {
  writeFileSync(BASELINE, JSON.stringify(report, null, 2) + "\n");
  console.log(`Baseline disimpan ke ${BASELINE}`);
}

if (failures.length > 0) console.log("\nGATE GAGAL:\n- " + failures.join("\n- "));
if (problems.length > 0) console.log("\nBELUM LAYAK RILIS (golden set):\n- " + problems.join("\n- "));
if (failures.length === 0 && problems.length === 0) console.log("\nGATE LULUS");

process.exit(failures.length > 0 || problems.length > 0 ? 1 : 0);
