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

const aiOutput = {
  tasks: [
    { name: "Login Google", type: "new_feature", complexity: "medium", reason: "r", flags: [], breakdown: ["a"], questions: [], confidence: "high", custom_estimate_min: null, custom_estimate_max: null },
    { name: "Perbaiki total keranjang", type: "bug", complexity: "simple", reason: "r", flags: [], breakdown: ["b"], questions: [], confidence: "high", custom_estimate_min: null, custom_estimate_max: null },
    { name: "Laporan penjualan", type: "new_feature", complexity: "medium", reason: "r", flags: [], breakdown: ["c"], questions: [], confidence: "high", custom_estimate_min: null, custom_estimate_max: null },
  ],
  assumptions: ["Desain disediakan klien"],
  milestones_suggestion: [
    { name: "Fondasi", tasks: ["login google", "Fitur karangan"] },
    { name: "Perbaikan", tasks: ["Perbaiki total keranjang"] },
  ],
};

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: async () => ({ toolCalls: [{ input: aiOutput }] }),
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

  it("analisis menyimpan asumsi dan saran milestone (nama asing dibuang, sisanya belum dikelompokkan)", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const { runAnalysis } = await import("@/lib/ai/analyze");
    const estimation = await prisma.estimation.findFirstOrThrow({ where: { projectId: a.project } });

    const first = await runAnalysis(estimation.id, a.ws);
    expect(first.taskCount).toBe(3);

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

    // Analisis ulang mengganti milestone lama, bukan menumpuk.
    await runAnalysis(estimation.id, a.ws);
    expect(await prisma.milestone.count({ where: { estimationId: estimation.id } })).toBe(2);
  });

  it("analisis AI memakai kuota per workspace", async () => {
    const { consumeAnalysisQuota, ANALYSIS_LIMIT } = await import("@/lib/rate-limit");
    for (let i = 0; i < ANALYSIS_LIMIT; i++) {
      expect(await consumeAnalysisQuota(a.ws)).toEqual({ allowed: true });
    }
    expect(await consumeAnalysisQuota(a.ws)).toMatchObject({ allowed: false });
    // Workspace lain tidak ikut terkunci.
    expect(await consumeAnalysisQuota(b.ws)).toEqual({ allowed: true });
  });
});
