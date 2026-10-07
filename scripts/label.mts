/**
 * Alat bantu pelabelan golden set: `npm run label -- --reviewer="Nama Anda"`.
 *
 * Menampilkan satu kasus per layar beserta label draftnya, lalu mencatat persetujuan
 * reviewer. Tidak memanggil model — gunakan `npm run eval -- --show` kalau ingin melihat
 * keluaran AI sebagai pembanding sebelum memutuskan.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";

import { GATE, labelProblems, type GoldenCase } from "../src/lib/eval/metrics";

const GOLDEN_DIR = "evals/golden";

interface DraftCase extends GoldenCase {
  /** Ditandai saat label masih usulan awal, dibuang begitu cukup reviewer menyetujui. */
  draft?: boolean;
}

const reviewer = process.argv.find((arg) => arg.startsWith("--reviewer="))?.split("=")[1]?.trim();
if (!reviewer) {
  console.error('Wajib: --reviewer="Nama Anda" — nama itu dicatat di labelledBy.');
  process.exit(2);
}

const files = readdirSync(GOLDEN_DIR).filter((file) => file.endsWith(".json"));
const byFile = new Map<string, DraftCase[]>(
  files.map((file) => [file, JSON.parse(readFileSync(join(GOLDEN_DIR, file), "utf8")) as DraftCase[]]),
);

const save = (file: string) =>
  writeFileSync(join(GOLDEN_DIR, file), JSON.stringify(byFile.get(file), null, 2) + "\n");

/** Buka satu kasus di $EDITOR sebagai JSON; kembalikan hasil suntingan, atau null kalau tidak sah. */
function editInEditor(item: DraftCase): DraftCase | null {
  const tmp = join(process.env.TMPDIR ?? "/tmp", `golden-${item.id}.json`);
  writeFileSync(tmp, JSON.stringify(item, null, 2) + "\n");

  const editor = process.env.EDITOR ?? "nano";
  spawnSync(editor, [tmp], { stdio: "inherit" });

  try {
    const edited = JSON.parse(readFileSync(tmp, "utf8")) as DraftCase;
    const problems = labelProblems([edited]);
    if (problems.length > 0) {
      console.log("  Suntingan ditolak:\n   - " + problems.join("\n   - "));
      return null;
    }
    return edited;
  } catch (error) {
    console.log(`  JSON tidak terbaca: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function show(item: DraftCase, position: string) {
  const reviewers = item.labelledBy.length > 0 ? item.labelledBy.join(", ") : "belum ada";
  console.log(`\n${"─".repeat(72)}\n${position}  ${item.id}   (reviewer: ${reviewers})\n`);
  console.log(`  ${item.requirement}\n`);
  for (const task of item.expectedTasks) {
    const flags = task.flags.length > 0 ? task.flags.join(", ") : "tanpa flag";
    console.log(`  · ${task.complexity.padEnd(12)} kata kunci: ${task.keywords.join(" + ").padEnd(24)} [${flags}]`);
  }
}

const pending = files.flatMap((file) =>
  (byFile.get(file) ?? [])
    .map((item, index) => ({ file, index, item }))
    .filter(({ item }) => !item.labelledBy.includes(reviewer)),
);

if (pending.length === 0) {
  console.log(`Tidak ada kasus tersisa untuk reviewer "${reviewer}".`);
  process.exit(0);
}

console.log(`${pending.length} kasus menunggu persetujuan "${reviewer}".`);
console.log("[Enter] setuju · [e] sunting dulu · [s] lewati · [q] simpan & keluar");

const rl = createInterface({ input: process.stdin, output: process.stdout });
let approved = 0;

for (const [order, { file, index, item }] of pending.entries()) {
  let current = item;
  show(current, `[${order + 1}/${pending.length}]`);

  const answer = (await rl.question("\n  > ")).trim().toLowerCase();
  if (answer === "q") break;
  if (answer === "s") continue;

  if (answer === "e") {
    const edited = editInEditor(current);
    if (!edited) continue;
    current = edited;
  }

  current.labelledBy = [...new Set([...current.labelledBy, reviewer])];
  // Label berhenti berstatus draft begitu cukup reviewer menyetujuinya.
  if (current.labelledBy.length >= GATE.minReviewers) delete current.draft;

  byFile.get(file)![index] = current;
  save(file);
  approved++;
}

rl.close();

const all = files.flatMap((file) => byFile.get(file) ?? []);
const siap = all.filter((item) => new Set(item.labelledBy).size >= GATE.minReviewers).length;
console.log(`\n${approved} kasus disetujui pada sesi ini.`);
console.log(`Total siap rilis: ${siap}/${all.length} kasus (butuh ≥ ${GATE.minReviewers} reviewer, minimal ${GATE.minCases} kasus).`);
