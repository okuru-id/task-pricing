/**
 * Prompt pipeline analisis, dipecah per tahap (§2 AI Analysis, §3 PRD).
 * Aturan guardrail yang sama dipakai ulang di tahap yang relevan, bukan diduplikasi.
 */

/**
 * Konteks profesi yang membentuk prompt. Diambil dari JobProfile supaya aplikasi tidak lagi
 * menganggap semua pekerjaan adalah software: "Complex" bagi fotografer bukan "Complex" bagi
 * developer, dan itu langsung menentukan harga. Field kosong jatuh ke default software di bawah,
 * jadi workspace tanpa profil berperilaku persis seperti sebelum profil ada.
 */
export interface JobPromptConfig {
  aiInstruction?: string | null;
  simpleGuide?: string | null;
  mediumGuide?: string | null;
  complexGuide?: string | null;
  veryComplexGuide?: string | null;
}

const DEFAULT_TRADE = "software developer";

const preamble = (job?: JobPromptConfig | null) => {
  const trade = job?.aiInstruction?.trim();
  const identity = trade
    ? `Anda adalah asisten analisis requirement untuk freelancer Indonesia.\n${trade}`
    : `Anda adalah asisten analisis requirement untuk freelancer ${DEFAULT_TRADE} Indonesia.`;

  return `${identity}
Anda bekerja dalam beberapa tahap berurutan; saat ini Anda mengerjakan SATU tahap saja dan hasilnya
dikirim lewat tool yang disediakan. Gunakan bahasa Indonesia untuk semua teks.`;
};

const EXTRACTION_RULES = `ATURAN EKSTRAKSI
- Satu kalimat customer BUKAN berarti satu task. Pisahkan pekerjaan yang independen menjadi task terpisah.
- Setiap task WAJIB dapat ditelusuri ke kalimat/bagian spesifik dari input. DILARANG mengarang task yang tidak disebut customer.`;

/** Definisi default (software) — dipakai bila profil pekerjaan tidak mengisi tingkat tersebut. */
const DEFAULT_COMPLEXITY_GUIDE = {
  simple: "scope jelas, perubahan kecil, dependency rendah. Contoh: tambah menu, ubah label, tambah field, validasi sederhana.",
  medium: "frontend + backend, query DB, business logic sederhana. Contoh: CRUD relasi, filter tanggal, search/pagination, export data.",
  complex: "beberapa module, business logic penting, perubahan DB, workflow existing berubah. Contoh: approval workflow, multi-step transaction, reporting kompleks.",
  veryComplex: "module baru, integrasi payment, external API signifikan, perubahan arsitektur, migrasi data besar, real-time, AI/ML, atau estimasi lebih dari 1 hari kerja.",
} as const;

const complexityRules = (job?: JobPromptConfig | null) => {
  const pick = (value: string | null | undefined, fallback: string) => value?.trim() || fallback;

  return `ATURAN COMPLEXITY
- simple: ${pick(job?.simpleGuide, DEFAULT_COMPLEXITY_GUIDE.simple)}
- medium: ${pick(job?.mediumGuide, DEFAULT_COMPLEXITY_GUIDE.medium)}
- complex: ${pick(job?.complexGuide, DEFAULT_COMPLEXITY_GUIDE.complex)}
- very_complex: ${pick(job?.veryComplexGuide, DEFAULT_COMPLEXITY_GUIDE.veryComplex)}
- JANGAN memaksa task besar menjadi complex. Jika ragu antara complex dan very_complex, pilih very_complex.

ATURAN VERY COMPLEX
- Jika complexity = very_complex, Anda WAJIB mengisi custom_estimate_min dan custom_estimate_max dalam rupiah (angka, bukan teks).
- Untuk complexity selain very_complex, isi custom_estimate_min dan custom_estimate_max dengan null.

CONFIDENCE
- high: requirement jelas dan lengkap.
- medium: sebagian jelas, ada asumsi kecil.
- low: requirement ambigu.`;
};

const FLAG_RULES = `ATURAN FLAG
- Task yang menyangkut payment gateway, API pihak ketiga, atau integrasi eksternal: beri THIRD_PARTY_DEPENDENCY.
- Task migrasi data: beri DATA_MIGRATION.
- Task yang mengubah skema/struktur database: beri DATABASE_REVIEW.
- Task yang mengubah arsitektur: beri ARCHITECTURE_REVIEW.
- Requirement ambigu: beri CLARIFICATION_REQUIRED.
- Task very_complex: beri COMPLEX_REVIEW.
- Gunakan NO_FLAG hanya jika benar-benar tidak ada flag lain.`;

const PROHIBITIONS = `LARANGAN KERAS
- DILARANG menentukan harga akhir. Harga dihitung oleh mesin harga aplikasi, bukan Anda.
  custom_estimate_min/max hanya untuk very_complex sebagai RANGE indikatif, bukan harga final.
- DILARANG mengarang requirement atau mengasumsikan provider/teknologi yang tidak disebut customer.
  Jika provider tidak disebut, jangan tebak: buat pertanyaan klarifikasi.
- DILARANG memasukkan biaya provider/hosting/domain ke dalam task development.
- Jika informasi tidak tersedia, tulis "Tidak disebutkan" atau buat pertanyaan klarifikasi.`;

const INDEX_RULE = `Setiap task punya nomor "index". Gunakan index PERSIS seperti pada daftar, dan berikan satu entri untuk SETIAP task.`;

export type AiStageKey = "extract" | "breakdown" | "complexity" | "dependencies";

const stageSections = (stage: AiStageKey, job?: JobPromptConfig | null): string[] => {
  switch (stage) {
    case "extract":
      return [
        preamble(job),
        "TAHAP: EKSTRAKSI. Ubah requirement mentah menjadi daftar task (nama + tipe) dan catat asumsi.",
        EXTRACTION_RULES,
        `ASUMSI\nCatat asumsi yang Anda pakai (mis. "Sistem autentikasi existing sudah tersedia") agar tidak terjadi dispute scope.`,
        PROHIBITIONS,
      ];
    case "breakdown":
      return [
        preamble(job),
        "TAHAP: BREAKDOWN. Untuk setiap task, tulis langkah pekerjaan teknis yang konkret dan pertanyaan klarifikasi jika requirement ambigu.",
        INDEX_RULE,
        "- Pertanyaan klarifikasi hanya untuk hal yang benar-benar tidak jelas; kosongkan jika tidak ada.",
        PROHIBITIONS,
      ];
    case "complexity":
      return [
        preamble(job),
        "TAHAP: KOMPLEKSITAS. Nilai complexity, alasan singkat, dan confidence tiap task.",
        INDEX_RULE,
        complexityRules(job),
        PROHIBITIONS,
      ];
    case "dependencies":
      return [
        preamble(job),
        "TAHAP: DEPENDENSI. Tentukan flag risiko tiap task, lalu usulkan pengelompokan task menjadi milestone (tahap pengerjaan).",
        INDEX_RULE,
        FLAG_RULES,
        "ATURAN MILESTONE\n- Sebut task di milestone dengan NAMA persis seperti pada daftar. Satu task hanya boleh masuk satu milestone.",
        PROHIBITIONS,
      ];
  }
};

export function buildStageSystem(
  stage: AiStageKey,
  customInstruction?: string | null,
  job?: JobPromptConfig | null,
): string {
  const base = stageSections(stage, job).join("\n\n");
  const extra = customInstruction?.trim() ? `\n\nINSTRUKSI GLOBAL USER:\n${customInstruction.trim()}` : "";
  return base + extra;
}

const requirementBlock = (requirement: string) => `REQUIREMENT CUSTOMER:\n\"\"\"\n${requirement}\n\"\"\"`;

export interface TaskLine {
  index: number;
  name: string;
  type?: string;
  complexity?: string;
  breakdown?: string[];
}

const taskList = (tasks: TaskLine[]) =>
  tasks
    .map((task) => {
      const meta = [task.type, task.complexity].filter(Boolean).join(", ");
      const steps = task.breakdown?.length ? `\n   Langkah: ${task.breakdown.join("; ")}` : "";
      return `${task.index}. ${task.name}${meta ? ` (${meta})` : ""}${steps}`;
    })
    .join("\n");

export function buildStagePrompt(stage: AiStageKey, requirement: string, tasks: TaskLine[] = []): string {
  if (stage === "extract") return `Ekstrak task dari requirement berikut.\n\n${requirementBlock(requirement)}`;

  return `${requirementBlock(requirement)}\n\nDAFTAR TASK:\n${taskList(tasks)}`;
}
