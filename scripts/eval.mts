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

/**
 * Tiap kasus berisi 4 panggilan model BERURUTAN (~100 detik), tapi antar-kasus tidak saling
 * bergantung — jadi beberapa kasus dijalankan bersamaan. Naikkan bila gateway kuat, turunkan
 * ke 1 bila kena rate limit.
 */
const concurrencyArg = Number(process.argv.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1]);
const concurrency = Math.max(1, Number.isFinite(concurrencyArg) && concurrencyArg > 0 ? concurrencyArg : 4);

const scores: ReturnType<typeof scoreCase>[] = new Array(cases.length);
const show = process.argv.includes("--show");
let cursor = 0;

/**
 * Keluaran mentah tiap kasus disimpan karena satu run penuh memakan ~20 menit dan biaya model.
 * Dengan ini, menelusuri "kenapa complexity meleset" atau "task mana yang dianggap halusinasi"
 * tidak perlu memanggil model lagi — cukup baca `evals/last-run.json`.
 */
const RUN_LOG = "evals/last-run.json";
const runLog: { id: string; requirement: string; tasks: unknown; expected: unknown; error?: string }[] =
  new Array(cases.length);

async function worker() {
  while (cursor < cases.length) {
    const index = cursor++;
    const golden = cases[index];
    // Keluaran dikumpulkan dulu supaya baris antar-kasus tidak saling menyisip saat paralel.
    const lines: string[] = [];

    try {
      const analysis = await generateAnalysisWith(golden.requirement, settings);
      const tasks = analysis.tasks.map(applyGuardrails).map((task) => ({
        name: task.name,
        reason: task.reason,
        breakdown: task.breakdown,
        complexity: task.complexity,
        flags: task.flags,
      }));
      scores[index] = scoreCase(golden, tasks);
      runLog[index] = {
        id: golden.id,
        requirement: golden.requirement,
        tasks,
        expected: golden.expectedTasks,
      };
      lines.push(`✓ ${golden.id}: ${tasks.length} task`);

      // --show menampilkan keluaran model mentah: dipakai reviewer saat melabeli
      // dan saat menelusuri kenapa sebuah metrik jatuh.
      if (show) {
        for (const task of tasks) {
          lines.push(`    ${task.complexity.padEnd(12)} ${task.name}  [${task.flags.join(", ")}]`);
        }
        for (const expected of golden.expectedTasks) {
          lines.push(`    label→ ${expected.complexity.padEnd(12)} ${expected.keywords.join("+")}  [${expected.flags.join(", ")}]`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      scores[index] = scoreCase(golden, null);
      runLog[index] = {
        id: golden.id,
        requirement: golden.requirement,
        tasks: null,
        expected: golden.expectedTasks,
        error: message,
      };
      lines.push(`✗ ${golden.id}: ${message}`);
    }

    console.log(lines.join("\n"));
  }
}

const started = Date.now();
await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, worker));
const elapsed = (Date.now() - started) / 1000;

const report = aggregate(scores);
const baseline: Report | null = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null;

writeFileSync(RUN_LOG, JSON.stringify(runLog.filter(Boolean), null, 2) + "\n");

const menit = Math.floor(elapsed / 60);
const durasi = menit > 0 ? `${menit}m ${Math.round(elapsed % 60)}s` : `${elapsed.toFixed(1)}s`;
console.log(`\nModel: ${settings.model} · ${cases.length} kasus · ${durasi} · ${concurrency} paralel\n`, report);

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
