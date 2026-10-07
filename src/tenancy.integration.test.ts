/**
 * Test isolasi tenant (§4 Multi-Tenancy): workspace B tidak boleh menyentuh data workspace A.
 * Butuh Postgres yang sudah dimigrasi — jalankan dengan:
 *   TEST_DATABASE_URL=postgresql://... npm run test:run
 * Tanpa variabel itu suite ini di-skip.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: async (options: { toolChoice: { toolName: string } }) => {
    const name = options.toolChoice.toolName;
    modelCalls.push(name);
    if (failing.has(name)) throw new Error("model error buatan");
    return { toolCalls: [{ input: stageOutputs[name] }] };
  },
}));

describe.skipIf(!DB_URL)("isolasi antar workspace", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let a: { ws: string; project: string; task: string; vcTask: string; question: string; vcQuestion: string; quotation: string };
  let b: { ws: string };

  beforeAll(async () => {
    process.env.DATABASE_URL = DB_URL;
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

  it("analisis per tahap: simpan asumsi + milestone, tahap gagal diulang sendirian, analisis ulang mengganti hasil", async () => {
    process.env.OPENAI_API_KEY = "test-key";
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

  it("lease: permintaan kedua pada job yang sedang berjalan mendapat 'busy'", async () => {
    process.env.OPENAI_API_KEY = "test-key";
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
