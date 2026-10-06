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
