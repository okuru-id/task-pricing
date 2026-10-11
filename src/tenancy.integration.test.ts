/**
 * Test isolasi tenant (§4 Multi-Tenancy): workspace B tidak boleh menyentuh data workspace A.
 * Butuh Postgres yang sudah dimigrasi — jalankan dengan:
 *   TEST_DATABASE_URL=postgresql://... npm run test:run
 * Tanpa variabel itu suite ini di-skip.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const DB_URL = process.env.TEST_DATABASE_URL;

let scope = { userId: "u", workspaceId: "" };

vi.mock("@/lib/workspace", () => ({ requireScope: async () => scope }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const T = (name: string, type: string) => ({ name, type });
const stageOutputs: Record<string, unknown> = {
  submit_extract: {
    tasks: [T("Login Google", "new_feature"), T("Perbaiki total keranjang", "bug"), T("Laporan penjualan", "new_feature")],
    assumptions: ["Desain disediakan klien"],
  },
  submit_breakdown: {
    items: [0, 1, 2].map((index) => ({ index, breakdown: [`langkah ${index}`], questions: [] })),
  },
  submit_complexity: {
    items: [
      { index: 0, complexity: "medium", reason: "r", confidence: "high", custom_estimate_min: null, custom_estimate_max: null },
      { index: 1, complexity: "simple", reason: "r", confidence: "high", custom_estimate_min: null, custom_estimate_max: null },
      { index: 2, complexity: "medium", reason: "r", confidence: "high", custom_estimate_min: null, custom_estimate_max: null },
    ],
  },
  submit_dependencies: {
    items: [0, 1, 2].map((index) => ({ index, flags: ["NO_FLAG"] })),
    milestones_suggestion: [
      { name: "Fondasi", tasks: ["login google", "Fitur karangan"] },
      { name: "Perbaikan", tasks: ["Perbaiki total keranjang"] },
    ],
  },
};

/** Catatan panggilan model palsu: tahap mana saja yang benar-benar dipanggil, dan tahap yang dipaksa gagal. */
const modelCalls: string[] = [];
const failing = new Set<string>();
/** Dipanggil di tengah panggilan model — dipakai untuk mensimulasikan lease yang diambil alih saat tahap berjalan. */
let duringModelCall: (() => Promise<void>) | null = null;

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: async (options: { toolChoice?: { toolName: string } }) => {
    // Tanpa toolChoice = permintaan teks biasa (mis. Tes koneksi di Settings).
    if (!options.toolChoice) return { text: "OK", toolCalls: [] };
    const name = options.toolChoice.toolName;
    modelCalls.push(name);
    if (failing.has(name)) throw new Error("model error buatan");
    await duringModelCall?.();
    return { toolCalls: [{ input: stageOutputs[name] }] };
  },
}));

describe.skipIf(!DB_URL)("isolasi antar workspace", () => {
  // Keadaan model palsu tidak boleh bocor antar tes.
  beforeEach(() => {
    modelCalls.length = 0;
    failing.clear();
    duringModelCall = null;
  });

  let prisma: typeof import("@/lib/prisma").prisma;
  let a: { ws: string; project: string; task: string; vcTask: string; question: string; vcQuestion: string; quotation: string };
  let b: { ws: string };

  beforeAll(async () => {
    process.env.DATABASE_URL = DB_URL;
    process.env.AUTH_SECRET = "test-auth-secret"; // kunci enkripsi API key (bukan konfigurasi AI)
    ({ prisma } = await import("@/lib/prisma"));

    const wsA = await prisma.workspace.create({ data: { name: "tenant-a" } });
    const wsB = await prisma.workspace.create({ data: { name: "tenant-b" } });

    const project = await prisma.project.create({
      data: {
        workspaceId: wsA.id,
        name: "Project A",
        estimations: {
          create: {
            requirement: "x".repeat(60),
            tasks: {
              create: [
                {
                  name: "Task A",
                  type: "BUG",
                  complexity: "SIMPLE",
                  price: 100_000,
                  clarificationQuestions: { create: [{ question: "Q1" }] },
                },
                {
                  name: "Task VC",
                  type: "NEW_FEATURE",
                  complexity: "VERY_COMPLEX",
                  price: 1,
                  customEstimateMin: 1,
                  customEstimateMax: 2,
                  clarificationQuestions: { create: [{ question: "Satu-satunya" }] },
                },
              ],
            },
          },
        },
      },
      include: { estimations: { include: { tasks: { include: { clarificationQuestions: true } } } } },
    });

    const [t1, t2] = project.estimations[0].tasks.sort((x, y) => x.name.localeCompare(y.name));
    const quotation = await prisma.quotation.create({
      data: { estimationId: project.estimations[0].id, total: 1, assumptions: [], exclusions: [] },
    });

    a = {
      ws: wsA.id,
      project: project.id,
      task: t1.id,
      vcTask: t2.id,
      question: t1.clarificationQuestions[0].id,
      vcQuestion: t2.clarificationQuestions[0].id,
      quotation: quotation.id,
    };
    b = { ws: wsB.id };
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  const asA = () => (scope = { userId: "ua", workspaceId: a.ws });
  const asB = () => (scope = { userId: "ub", workspaceId: b.ws });

  /** Konfigurasi AI workspace A lewat jalur yang sama dengan UI Settings (BYOK, tersimpan di DB). */
  const ensureAiConfig = async () => {
    asA();
    const { saveAiSettings } = await import("@/app/(app)/settings/actions");
    expect(await saveAiSettings({ provider: "openai", model: "model-uji", temperature: 0.2, apiKey: "sk-test-1234" })).toEqual({ ok: true });
  };

  it("project-level: workspace lain mendapat 404 / null", async () => {
    asB();
    const { getLatestEstimation } = await import("@/lib/data/estimations");
    const { getLatestQuotation } = await import("@/lib/data/quotation");

    await expect(getLatestEstimation(a.project, b.ws)).rejects.toThrow("NOT_FOUND");
    expect(await getLatestQuotation(a.project, b.ws)).toBeNull();
    expect(await getLatestQuotation(a.project, a.ws)).not.toBeNull();
  });

  it("aksi Task Review ditolak lintas workspace", async () => {
    asB();
    const actions = await import("@/app/(app)/projects/[id]/actions");

    expect(await actions.deleteTask(a.task)).toMatchObject({ ok: false });
    expect(await actions.addTask(a.project)).toMatchObject({ ok: false });
    expect(await actions.moveTask(a.task, "down")).toMatchObject({ ok: false });
    expect(
      await actions.updateTask({
        taskId: a.task,
        name: "diretas",
        type: "BUG",
        complexity: "SIMPLE",
        reason: null,
        description: null,
        priority: 0,
        flags: [],
        breakdown: [],
        questions: [],
        customEstimateMin: null,
        customEstimateMax: null,
      }),
    ).toMatchObject({ ok: false });

    const task = await prisma.estimationTask.findUniqueOrThrow({ where: { id: a.task } });
    expect(task.name).toBe("Task A");
  });

  it("aksi Klarifikasi ditolak lintas workspace", async () => {
    asB();
    const actions = await import("@/app/(app)/projects/[id]/clarification/actions");

    expect(await actions.addQuestion(a.task, "spam")).toMatchObject({ ok: false });
    expect(await actions.updateQuestion(a.question, "diretas")).toMatchObject({ ok: false });
    expect(await actions.deleteQuestion(a.question)).toMatchObject({ ok: false });
    expect(await prisma.clarificationQuestion.count({ where: { estimationTaskId: a.task } })).toBe(1);
  });

  it("pertanyaan terakhir Very Complex tidak bisa dihapus bahkan oleh pemilik", async () => {
    asA();
    const actions = await import("@/app/(app)/projects/[id]/clarification/actions");
    expect(await actions.deleteQuestion(a.vcQuestion)).toMatchObject({ ok: false });
    expect(await actions.deleteQuestion(a.question)).toEqual({ ok: true });
  });

  it("quotation dan lifecycle ditolak lintas workspace", async () => {
    asB();
    const quotationActions = await import("@/app/(app)/projects/[id]/quotation/actions");
    const lifecycle = await import("@/app/(app)/projects/[id]/lifecycle-actions");

    expect(await quotationActions.createQuotation(a.project)).toMatchObject({ ok: false });
    expect(await lifecycle.setProjectStatus(a.project, "ARCHIVED")).toMatchObject({ ok: false });
    expect(await lifecycle.deleteQuotation(a.quotation)).toMatchObject({ ok: false });
    await expect(lifecycle.deleteProject(a.project)).resolves.toMatchObject({ ok: false });

    const project = await prisma.project.findUniqueOrThrow({ where: { id: a.project } });
    expect(project.deletedAt).toBeNull();
    expect(project.status).toBe("DRAFT");
  });

  it("milestone: aksi lintas workspace ditolak, pemilik bisa mengelompokkan dan harga ikut tersinkron", async () => {
    const actions = await import("@/app/(app)/projects/[id]/milestone/actions");

    asB();
    expect(await actions.createMilestone(a.project, "diretas")).toMatchObject({ ok: false });
    expect(await actions.autoGroupMilestones(a.project)).toMatchObject({ ok: false });
    expect(await actions.assignTask(a.vcTask, null)).toMatchObject({ ok: false });

    asA();
    expect(await actions.createMilestone(a.project, "Tahap 1")).toEqual({ ok: true });
    const milestone = await prisma.milestone.findFirstOrThrow({ where: { estimation: { projectId: a.project } } });

    // Milestone milik workspace A tidak bisa dipakai/diubah oleh B.
    asB();
    expect(await actions.renameMilestone(milestone.id, "diretas")).toMatchObject({ ok: false });
    expect(await actions.deleteMilestone(milestone.id)).toMatchObject({ ok: false });
    expect(await actions.moveMilestone(milestone.id, "down")).toMatchObject({ ok: false });

    asA();
    expect(await actions.assignTask(a.vcTask, milestone.id)).toEqual({ ok: true });
    const synced = await prisma.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
    expect(synced.price).toBe(1); // batas bawah Very Complex (customEstimateMin)

    expect(await actions.autoGroupMilestones(a.project)).toEqual({ ok: true });
    const grouped = await prisma.milestone.findMany({ where: { estimation: { projectId: a.project } }, include: { tasks: true } });
    expect(grouped.flatMap((m) => m.tasks).length).toBeGreaterThan(0);

    // Hapus milestone melepas task, bukan menghapusnya.
    expect(await actions.deleteMilestone(grouped[0].id)).toEqual({ ok: true });
    expect(await prisma.estimationTask.findUnique({ where: { id: a.vcTask } })).not.toBeNull();
  });

  it("loader quotation: pilih versi, daftar versi tanpa yang dihapus, workspace lain tidak melihat", async () => {
    const { getLatestQuotation } = await import("@/lib/data/quotation");
    const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });

    const v2 = await prisma.quotation.create({
      data: { estimationId: estimation.id, version: 2, total: 5, assumptions: [], exclusions: [] },
    });
    const v3 = await prisma.quotation.create({
      data: { estimationId: estimation.id, version: 3, total: 9, assumptions: [], exclusions: [] },
    });

    const latest = await getLatestQuotation(a.project, a.ws);
    expect(latest?.quotation?.version).toBe(3);
    expect(latest?.versions.map((q) => q.version)).toEqual([3, 2, 1]);

    expect((await getLatestQuotation(a.project, a.ws, 2))?.quotation?.total).toBe(5);
    expect((await getLatestQuotation(a.project, a.ws, 99))?.quotation).toBeNull();

    await prisma.quotation.update({ where: { id: v3.id }, data: { deletedAt: new Date() } });
    const afterDelete = await getLatestQuotation(a.project, a.ws);
    expect(afterDelete?.quotation?.version).toBe(2);
    expect(afterDelete?.versions.map((q) => q.version)).toEqual([2, 1]);
    expect((await getLatestQuotation(a.project, a.ws, 3))?.quotation).toBeNull();

    expect(await getLatestQuotation(a.project, b.ws, 2)).toBeNull();
    await prisma.quotation.delete({ where: { id: v2.id } });
  });

  it("BYOK: tanpa konfigurasi di DB analisis ditolak walau ada env OPENAI_API_KEY (tidak ada fallback ke env)", async () => {
    process.env.OPENAI_API_KEY = "sk-dari-env";
    process.env.OPENAI_BASE_URL = "http://env.example/v1";
    try {
      const { createAnalysisJob, advanceJob } = await import("@/lib/ai/job");
      const analyzeActions = await import("@/app/(app)/projects/[id]/analyze/actions");
      const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });

      modelCalls.length = 0;
      asB(); // workspace B tidak pernah mengisi konfigurasi
      const bProject = await prisma.project.create({
        data: { workspaceId: b.ws, name: "Project B", estimations: { create: { requirement: "y".repeat(80) } } },
        include: { estimations: true },
      });
      expect(await analyzeActions.beginAnalysis(bProject.id)).toMatchObject({ ok: false, code: "config" });

      const jobId = await createAnalysisJob(bProject.estimations[0].id, b.ws);
      const failed = await advanceJob(jobId, b.ws);
      expect(failed).toMatchObject({ state: "failed", stage: 0 });
      expect((failed as { error: string }).error).toContain("Settings");
      expect(modelCalls).toEqual([]);
      expect(estimation.id).toBeTruthy();
    } finally {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_BASE_URL;
    }
  });

  it("BYOK: API key tersimpan terenkripsi, tidak bocor ke tampilan, dan terisolasi per workspace", async () => {
    const { saveAiSettings, testAiConnection } = await import("@/app/(app)/settings/actions");
    const { getAiConfigView, requireAiSettings } = await import("@/lib/ai/provider");

    asA();
    // Validasi: key wajib untuk OpenAI, Base URL metadata cloud ditolak.
    expect(await saveAiSettings({ provider: "openai", model: "m", temperature: 0.2 })).toMatchObject({ ok: false });
    expect(
      await saveAiSettings({ provider: "ollama", model: "m", temperature: 0.2, baseUrl: "http://169.254.169.254/" }),
    ).toMatchObject({ ok: false });

    expect(
      await saveAiSettings({ provider: "openai", model: "gpt-x", temperature: 0.3, apiKey: "sk-rahasia-9876", baseUrl: "https://api.example.com/v1/" }),
    ).toEqual({ ok: true });

    const row = await prisma.aiConfig.findFirstOrThrow({ where: { workspaceId: a.ws } });
    expect(row.apiKeyEnc).toBeTruthy();
    expect(row.apiKeyEnc).not.toContain("sk-rahasia");
    expect(row.apiKeyHint).toBe("9876");
    expect(row.baseUrl).toBe("https://api.example.com/v1");

    const view = await getAiConfigView(a.ws);
    expect(view).toMatchObject({ hasKey: true, keyHint: "9876", model: "gpt-x" });
    expect(JSON.stringify(view)).not.toContain("sk-rahasia");
    expect((await requireAiSettings(a.ws)).apiKey).toBe("sk-rahasia-9876");

    // Key kosong = pertahankan; hanya satu baris per workspace.
    expect(await saveAiSettings({ provider: "openai", model: "gpt-y", temperature: 0.3, apiKey: "" })).toEqual({ ok: true });
    expect((await requireAiSettings(a.ws)).apiKey).toBe("sk-rahasia-9876");
    expect(await prisma.aiConfig.count({ where: { workspaceId: a.ws } })).toBe(1);

    // Workspace B tidak melihat konfigurasi A.
    expect(await getAiConfigView(b.ws)).toBeNull();
    asB();
    expect(await testAiConnection()).toMatchObject({ ok: false });

    // Uji koneksi workspace A memakai model palsu.
    asA();
    modelCalls.length = 0;
    expect(await testAiConnection()).toEqual({ ok: true });

    // Kebijakan default: endpoint localhost/jaringan privat ditolak (SSRF); Ollama wajib alamat publik.
    expect(await saveAiSettings({ provider: "ollama", model: "llama", temperature: 0.2 })).toMatchObject({ ok: false });
    expect(
      await saveAiSettings({ provider: "ollama", model: "llama", temperature: 0.2, baseUrl: "http://localhost:11434/v1" }),
    ).toMatchObject({ ok: false });
    expect(
      await saveAiSettings({ provider: "openai", model: "m", temperature: 0.2, baseUrl: "http://10.0.0.5/v1" }),
    ).toMatchObject({ ok: false });
    expect(
      await saveAiSettings({ provider: "ollama", model: "llama", temperature: 0.2, baseUrl: "https://ollama.contoh.com/v1" }),
    ).toEqual({ ok: true });

    // Self-host: operator mengizinkan jaringan privat → default localhost boleh.
    process.env.AI_ALLOW_PRIVATE_ENDPOINTS = "true";
    // Hapus key → konfigurasi tidak lengkap lagi.
    expect(await saveAiSettings({ provider: "ollama", model: "llama", temperature: 0.2, baseUrl: "", clearKey: true })).toEqual({ ok: true });
    delete process.env.AI_ALLOW_PRIVATE_ENDPOINTS;
    expect(await getAiConfigView(a.ws)).toMatchObject({ provider: "ollama", baseUrl: "http://localhost:11434/v1", hasKey: false });
    expect((await requireAiSettings(a.ws)).apiKey).toBeNull();
  });

  it("un-archive: pulih ke status sebelumnya, dijaga per workspace, dan turun jika isinya berubah", async () => {
    const lifecycle = await import("@/app/(app)/projects/[id]/lifecycle-actions");
    const project = await prisma.project.create({
      data: {
        workspaceId: a.ws,
        name: "Project arsip",
        status: "ACCEPTED",
        estimations: {
          create: {
            requirement: "z".repeat(60),
            tasks: { create: { name: "T", type: "BUG", complexity: "SIMPLE", price: 1 } },
          },
        },
      },
      include: { estimations: true },
    });
    const quotation = await prisma.quotation.create({
      data: { estimationId: project.estimations[0].id, total: 1, assumptions: [], exclusions: [] },
    });
    const statusOf = async () => (await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status;

    // Memulihkan project yang tidak diarsipkan ditolak.
    asA();
    expect(await lifecycle.restoreProject(project.id)).toMatchObject({ ok: false });

    expect(await lifecycle.setProjectStatus(project.id, "ARCHIVED")).toEqual({ ok: true });
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).archivedFrom).toBe("ACCEPTED");

    // Workspace lain tidak bisa memulihkan.
    asB();
    expect(await lifecycle.restoreProject(project.id)).toMatchObject({ ok: false });
    expect(await statusOf()).toBe("ARCHIVED");

    asA();
    expect(await lifecycle.restoreProject(project.id)).toEqual({ ok: true });
    const restored = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(restored).toMatchObject({ status: "ACCEPTED", archivedFrom: null });

    // Quotation dihapus selama diarsipkan → tidak boleh kembali ke Accepted.
    expect(await lifecycle.setProjectStatus(project.id, "ARCHIVED")).toEqual({ ok: true });
    await prisma.quotation.update({ where: { id: quotation.id }, data: { deletedAt: new Date() } });
    expect(await lifecycle.restoreProject(project.id)).toEqual({ ok: true });
    expect(await statusOf()).toBe("ANALYZED");

    // Project lama yang diarsipkan sebelum kolom archivedFrom ada (null) → ditebak dari isinya.
    await prisma.project.update({ where: { id: project.id }, data: { status: "ARCHIVED", archivedFrom: null } });
    expect(await lifecycle.restoreProject(project.id)).toEqual({ ok: true });
    expect(await statusOf()).toBe("ANALYZED");
  });

  it("resume: job lama yang gagal tidak muncul lagi setelah ada job baru, dan tidak boleh menimpa hasil job baru", async () => {
    await ensureAiConfig();
    const { createAnalysisJob, advanceJob, getResumableJob } = await import("@/lib/ai/job");
    const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });

    // Job lama berhenti (gagal di tahap kompleksitas).
    const oldJob = await createAnalysisJob(estimation.id, a.ws);
    failing.add("submit_complexity");
    await advanceJob(oldJob, a.ws);
    await advanceJob(oldJob, a.ws);
    expect(await advanceJob(oldJob, a.ws)).toMatchObject({ state: "failed", stage: 2 });
    failing.clear();
    expect(await getResumableJob(estimation.id, a.ws)).toMatchObject({ id: oldJob });

    // "Mulai ulang": job baru dibuat dan selesai. Job lama TIDAK boleh ditawarkan lagi.
    const newJob = await createAnalysisJob(estimation.id, a.ws);
    for (let i = 0; i < 5; i++) await advanceJob(newJob, a.ws);
    expect((await prisma.analysisJob.findUniqueOrThrow({ where: { id: newJob } })).status).toBe("DONE");
    expect(await getResumableJob(estimation.id, a.ws)).toBeNull();

    // Melanjutkan job lama (mis. tab lama) ditolak: tidak memanggil model dan tidak menimpa hasil baru.
    const before = await prisma.estimationTask.findMany({ where: { estimationId: estimation.id }, orderBy: { id: "asc" } });
    modelCalls.length = 0;
    const result = await advanceJob(oldJob, a.ws);
    expect(result).toMatchObject({ state: "failed" });
    expect((result as { error: string }).error).toContain("digantikan");
    expect(modelCalls).toEqual([]);
    const after = await prisma.estimationTask.findMany({ where: { estimationId: estimation.id }, orderBy: { id: "asc" } });
    expect(after.map((t) => t.id)).toEqual(before.map((t) => t.id));
  });

  it("fencing: pekerja yang leasenya diambil alih di tengah tahap tidak boleh menulis hasil / membersihkan lease baru", async () => {
    await ensureAiConfig();
    const { createAnalysisJob, advanceJob } = await import("@/lib/ai/job");
    const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });
    const jobId = await createAnalysisJob(estimation.id, a.ws);

    // Saat model berjalan, "pekerja lain" mengambil alih lease (token baru) dan memajukan tahap.
    duringModelCall = async () => {
      duringModelCall = null;
      await prisma.analysisJob.update({
        where: { id: jobId },
        data: { claimToken: "pekerja-baru", lockedUntil: new Date(Date.now() + 60_000), data: { marker: "milik-pekerja-baru" }, stage: 0 },
      });
    };

    const stale = await advanceJob(jobId, a.ws);
    expect(stale).toEqual({ state: "busy" }); // hasil pekerja basi dibuang

    const row = await prisma.analysisJob.findUniqueOrThrow({ where: { id: jobId } });
    expect(row.claimToken).toBe("pekerja-baru"); // lease pekerja baru tidak dikosongkan
    expect(row.data).toEqual({ marker: "milik-pekerja-baru" }); // outputnya tidak ditimpa
    expect(row.stage).toBe(0); // stage tidak dimundurkan/dimajukan oleh pekerja basi

  });

  it("fencing: kegagalan pekerja basi tidak boleh menandai job FAILED atau mengosongkan lease pekerja baru", async () => {
    await ensureAiConfig();
    const { createAnalysisJob, advanceJob } = await import("@/lib/ai/job");
    const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });
    const jobId = await createAnalysisJob(estimation.id, a.ws);

    let stolen = false;
    duringModelCall = async () => {
      if (!stolen) {
        stolen = true;
        await prisma.analysisJob.update({
          where: { id: jobId },
          data: { claimToken: "pekerja-baru", lockedUntil: new Date(Date.now() + 60_000) },
        });
      }
      throw new Error("model error setelah lease diambil alih"); // dua percobaan sama-sama gagal
    };

    expect(await advanceJob(jobId, a.ws)).toEqual({ state: "busy" });

    const row = await prisma.analysisJob.findUniqueOrThrow({ where: { id: jobId } });
    expect(row.status).toBe("RUNNING"); // bukan FAILED — itu hak pekerja yang memegang lease
    expect(row.error).toBeNull();
    expect(row.claimToken).toBe("pekerja-baru");
  });

  it("persistAnalysis: hook kepemilikan yang gagal membatalkan seluruh penyimpanan (rollback)", async () => {
    const { persistAnalysis } = await import("@/lib/ai/analyze");
    const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });
    const before = (await prisma.estimationTask.findMany({ where: { estimationId: estimation.id }, orderBy: { id: "asc" } })).map((t) => t.id);

    const analysis = {
      tasks: [
        { name: "Task Baru", type: "bug" as const, complexity: "simple" as const, reason: "r", flags: [], breakdown: [], questions: [], confidence: "high" as const, custom_estimate_min: null, custom_estimate_max: null },
      ],
      assumptions: ["asumsi baru"],
      milestones_suggestion: [],
    };

    await expect(
      persistAnalysis(estimation.id, a.ws, analysis, async () => {
        throw new Error("bukan pemilik lease");
      }),
    ).rejects.toThrow("bukan pemilik lease");

    const after = (await prisma.estimationTask.findMany({ where: { estimationId: estimation.id }, orderBy: { id: "asc" } })).map((t) => t.id);
    expect(after).toEqual(before); // task lama utuh
    expect((await prisma.estimation.findUniqueOrThrow({ where: { id: estimation.id } })).assumptions).not.toContain("asumsi baru");
  });

  it("quotation: nomor versi unik walau dibuat bersamaan, dan duplikat ditolak database", async () => {
    const { createQuotation } = await import("@/app/(app)/projects/[id]/quotation/actions");
    asA();
    // Pastikan tidak ada Very Complex tanpa pertanyaan (syarat pembuatan quotation).
    const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });
    await prisma.estimationTask.deleteMany({ where: { estimationId: estimation.id, complexity: "VERY_COMPLEX" } });

    const results = await Promise.all([createQuotation(a.project), createQuotation(a.project), createQuotation(a.project)]);
    expect(results.every((r) => r.ok)).toBe(true);

    const versions = (await prisma.quotation.findMany({ where: { estimationId: estimation.id } })).map((q) => q.version);
    expect(new Set(versions).size).toBe(versions.length); // tidak ada nomor ganda

    await expect(
      prisma.quotation.create({ data: { estimationId: estimation.id, version: versions[0], total: 1, assumptions: [], exclusions: [] } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("analisis per tahap: simpan asumsi + milestone, tahap gagal diulang sendirian, analisis ulang mengganti hasil", async () => {
    await ensureAiConfig();
    const { createAnalysisJob, advanceJob, getResumableJob } = await import("@/lib/ai/job");
    const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });

    // Workspace lain tidak bisa membuat maupun menjalankan job milik A.
    await expect(createAnalysisJob(estimation.id, b.ws)).rejects.toThrow();
    const tasksBefore = (await prisma.estimationTask.findMany({ where: { estimationId: estimation.id }, orderBy: { id: "asc" } })).map((t) => t.id);
    const jobId = await createAnalysisJob(estimation.id, a.ws);
    expect(await advanceJob(jobId, b.ws)).toMatchObject({ state: "failed" });
    expect(modelCalls).toEqual([]);

    // Tahap 1 dan 2 berhasil; tahap 3 (kompleksitas) gagal.
    failing.add("submit_complexity");
    expect(await advanceJob(jobId, a.ws)).toEqual({ state: "progress", completed: 1 });
    expect(await advanceJob(jobId, a.ws)).toEqual({ state: "progress", completed: 2 });
    const failed = await advanceJob(jobId, a.ws);
    expect(failed).toMatchObject({ state: "failed", stage: 2 });
    expect((failed as { error: string }).error).toContain("Menilai kompleksitas");

    // Job gagal bisa dilanjutkan dan tidak ada harga/task yang tersimpan.
    expect(await getResumableJob(estimation.id, a.ws)).toMatchObject({ stage: 2, status: "FAILED" });
    expect(await getResumableJob(estimation.id, b.ws)).toBeNull();
    // Tahap yang gagal tidak menyentuh hasil sebelumnya: task lama utuh, belum ada yang diganti.
    const tasksDuring = (await prisma.estimationTask.findMany({ where: { estimationId: estimation.id }, orderBy: { id: "asc" } })).map((t) => t.id);
    expect(tasksDuring).toEqual(tasksBefore);

    // Ulang: HANYA tahap kompleksitas yang dipanggil lagi (extract & breakdown tidak).
    modelCalls.length = 0;
    failing.clear();
    expect(await advanceJob(jobId, a.ws)).toEqual({ state: "progress", completed: 3 });
    expect(modelCalls).toEqual(["submit_complexity"]);

    expect(await advanceJob(jobId, a.ws)).toEqual({ state: "progress", completed: 4 });
    const done = await advanceJob(jobId, a.ws);
    expect(done).toEqual({ state: "done", taskCount: 3 });

    const saved = await prisma.estimation.findUniqueOrThrow({ where: { id: estimation.id } });
    expect(saved.assumptions).toEqual(["Desain disediakan klien"]);

    const milestones = await prisma.milestone.findMany({
      where: { estimationId: estimation.id },
      orderBy: { priority: "asc" },
      include: { tasks: { orderBy: { order: "asc" } } },
    });
    expect(milestones.map((m) => [m.name, m.tasks.map((t) => t.name), m.price])).toEqual([
      ["Fondasi", ["Login Google"], 200_000],
      ["Perbaikan", ["Perbaiki total keranjang"], 100_000],
    ]);
    expect(await prisma.estimationTask.count({ where: { estimationId: estimation.id, milestoneId: null } })).toBe(1);

    // Job selesai bersifat idempoten dan tidak lagi ditawarkan untuk dilanjutkan.
    modelCalls.length = 0;
    expect(await advanceJob(jobId, a.ws)).toEqual({ state: "done", taskCount: 3 });
    expect(modelCalls).toEqual([]);
    expect(await getResumableJob(estimation.id, a.ws)).toBeNull();

    // Analisis ulang (job baru) mengganti milestone lama, bukan menumpuk.
    const second = await createAnalysisJob(estimation.id, a.ws);
    for (let i = 0; i < 5; i++) await advanceJob(second, a.ws);
    expect(await prisma.milestone.count({ where: { estimationId: estimation.id } })).toBe(2);
    expect(await prisma.estimationTask.count({ where: { estimationId: estimation.id } })).toBe(3);
  });

  it("moveTaskTo: memindahkan ke posisi tujuan (drag-and-drop), menggeser sisanya, dan dijaga per workspace", async () => {
    const actions = await import("@/app/(app)/projects/[id]/actions");
    const project = await prisma.project.create({
      data: {
        workspaceId: a.ws,
        name: "Project urut",
        estimations: {
          create: {
            requirement: "u".repeat(60),
            tasks: {
              create: ["A", "B", "C", "D"].map((name, order) => ({ name, order, type: "BUG" as const, complexity: "SIMPLE" as const, price: 1 })),
            },
          },
        },
      },
      include: { estimations: { include: { tasks: true } } },
    });
    const byName = Object.fromEntries(project.estimations[0].tasks.map((t) => [t.name, t.id]));
    const names = async () =>
      (await prisma.estimationTask.findMany({ where: { estimationId: project.estimations[0].id }, orderBy: { order: "asc" } })).map((t) => t.name).join("");

    asB();
    expect(await actions.moveTaskTo(byName.A, 2)).toMatchObject({ ok: false });
    expect(await names()).toBe("ABCD");

    asA();
    expect(await actions.moveTaskTo(byName.A, 2)).toEqual({ ok: true });
    expect(await names()).toBe("BCAD"); // A turun ke indeks 2; B dan C naik satu
    expect(await actions.moveTaskTo(byName.D, 0)).toEqual({ ok: true });
    expect(await names()).toBe("DBCA");
    expect(await actions.moveTaskTo(byName.D, 99)).toEqual({ ok: true }); // dijepit ke posisi terakhir
    expect(await names()).toBe("BCAD");
    expect(await actions.moveTaskTo(byName.B, 0)).toEqual({ ok: true }); // posisi sama = tidak ada perubahan
    expect(await names()).toBe("BCAD");
    expect(await actions.moveTaskTo(byName.B, 1.5)).toMatchObject({ ok: false });
  });

  it("lease: permintaan kedua pada job yang sedang berjalan mendapat 'busy'", async () => {
    await ensureAiConfig();
    const { createAnalysisJob, advanceJob } = await import("@/lib/ai/job");
    const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });
    const jobId = await createAnalysisJob(estimation.id, a.ws);

    await prisma.analysisJob.update({ where: { id: jobId }, data: { lockedUntil: new Date(Date.now() + 60_000) } });
    modelCalls.length = 0;
    expect(await advanceJob(jobId, a.ws)).toEqual({ state: "busy" });
    expect(modelCalls).toEqual([]);

    // Lease kedaluwarsa (mis. server mati di tengah tahap) → bisa diambil alih.
    await prisma.analysisJob.update({ where: { id: jobId }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    expect(await advanceJob(jobId, a.ws)).toEqual({ state: "progress", completed: 1 });
  });
});
