/** Eval offline AI + release gate: `npm run eval` (lihat evals/README.md). */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { applyGuardrails, generateAnalysisWith } from "../src/lib/ai/analyze";
import { requireAiSettings } from "../src/lib/ai/provider";
import {
  aggregate,
  checkGate,
  datasetProblems,
  labelProblems,
  scoreCase,
  type GoldenCase,
  type Report,
} from "../src/lib/eval/metrics";

const GOLDEN_DIR = "evals/golden";
const BASELINE = "evals/baseline.json";

const all: GoldenCase[] = readdirSync(GOLDEN_DIR)
  .filter((file) => file.endsWith(".json"))
  .flatMap((file) => JSON.parse(readFileSync(join(GOLDEN_DIR, file), "utf8")) as GoldenCase[]);

// Label cacat dicek lebih dulu: satu kasus = 4 panggilan model, percuma dibayar untuk label rusak.
const broken = labelProblems(all);
if (broken.length > 0) {
  console.error("Label golden set bermasalah:\n- " + broken.join("\n- "));
  process.exit(2);
}

// --limit untuk uji cepat/murah. Skor parsial tidak boleh jadi baseline atau bukti rilis.
const limit = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1]);
const partial = Number.isFinite(limit) && limit > 0 && limit < all.length;
const cases = partial ? all.slice(0, limit) : all;

// Konfigurasi AI diambil dari database (diisi di Settings), bukan dari environment variable.
const workspaceArg = process.argv.find((arg) => arg.startsWith("--workspace="))?.split("=")[1];
if (!workspaceArg) {
  console.error("Wajib: --workspace=<id workspace> — konfigurasi AI (provider, model, API key) dibaca dari Settings workspace itu.");
  process.exit(2);
}
const settings = await requireAiSettings(workspaceArg);

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

    // --show menampilkan keluaran model mentah: dipakai reviewer saat melabeli
    // dan saat menelusuri kenapa sebuah metrik jatuh.
    if (process.argv.includes("--show")) {
      for (const task of tasks) {
        console.log(`    ${task.complexity.padEnd(12)} ${task.name}  [${task.flags.join(", ")}]`);
      }
      for (const expected of golden.expectedTasks) {
        console.log(`    label→ ${expected.complexity.padEnd(12)} ${expected.keywords.join("+")}  [${expected.flags.join(", ")}]`);
      }
    }
  } catch (error) {
    scores.push(scoreCase(golden, null));
    console.log(`✗ ${golden.id}: ${error instanceof Error ? error.message : error}`);
  }
}

const report = aggregate(scores);
const baseline: Report | null = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null;

console.log(`\nModel: ${settings.model}\n`, report);

const failures = checkGate(report, baseline);
const problems = partial
  ? [`dijalankan parsial (${cases.length}/${all.length} kasus) — bukan bukti rilis`]
  : datasetProblems(cases);

if (process.argv.includes("--update-baseline")) {
  if (partial) {
    console.log("\nBaseline TIDAK disimpan: skor parsial bukan baseline yang sah.");
  } else {
    writeFileSync(BASELINE, JSON.stringify(report, null, 2) + "\n");
    console.log(`Baseline disimpan ke ${BASELINE}`);
  }
}

if (failures.length > 0) console.log("\nGATE GAGAL:\n- " + failures.join("\n- "));
if (problems.length > 0) console.log("\nBELUM LAYAK RILIS (golden set):\n- " + problems.join("\n- "));
if (failures.length === 0 && problems.length === 0) console.log("\nGATE LULUS");

process.exit(failures.length > 0 || problems.length > 0 ? 1 : 0);
