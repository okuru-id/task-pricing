"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Circle, CircleCheck, Info, Loader, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STAGES, STAGE_COUNT } from "@/lib/ai/stages";
import { cn } from "@/lib/utils";

import { advanceAnalysis, beginAnalysis } from "./actions";

export interface ResumeInfo {
  jobId: string;
  /** Jumlah tahap yang sudah selesai pada job tersebut. */
  stage: number;
  error: string | null;
}

type Phase = "ready" | "running" | "failed" | "done";

const BUSY_POLL_MS = 2000;
const BUSY_MAX_POLLS = 75; // ≈ 2,5 menit — sebanding dengan lease server

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Progress analisis per tahap yang NYATA: tiap tahap adalah satu panggilan server dan hasilnya disimpan.
 * Tahap yang gagal diulang sendirian (mulai dari tahap itu), bukan dari awal (§2 AI Analysis).
 */
export function AnalysisProgress({ projectId, resume }: { projectId: string; resume: ResumeInfo | null }) {
  const router = useRouter();
  const [completed, setCompleted] = useState(resume?.stage ?? 0);
  const [phase, setPhase] = useState<Phase>(resume ? "ready" : "running");
  const [error, setError] = useState<string | null>(resume?.error ?? null);
  const [jobId, setJobId] = useState<string | null>(resume?.jobId ?? null);
  const started = useRef(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true; // job tetap tersimpan di server dan bisa dilanjutkan
    };
  }, []);

  const drive = useCallback(
    async (id: string) => {
      setPhase("running");
      setError(null);

      let polls = 0;
      while (!cancelled.current) {
        let result;
        try {
          result = await advanceAnalysis(id, projectId);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Analisis gagal");
          setPhase("failed");
          return;
        }

        if (result.state === "busy") {
          if (++polls > BUSY_MAX_POLLS) {
            setError("Analisis ini sedang diproses di tab lain. Muat ulang halaman untuk melihat statusnya.");
            setPhase("failed");
            return;
          }
          await sleep(BUSY_POLL_MS);
          continue;
        }
        polls = 0;

        if (result.state === "progress") {
          setCompleted(result.completed);
        } else if (result.state === "done") {
          setCompleted(STAGE_COUNT);
          setPhase("done");
          router.push(`/projects/${projectId}`);
          return;
        } else {
          setCompleted(result.stage);
          setError(result.error);
          setPhase("failed");
          return;
        }
      }
    },
    [projectId, router],
  );

  const begin = useCallback(async () => {
    setPhase("running");
    setError(null);
    setCompleted(0);

    const result = await beginAnalysis(projectId).catch((cause: unknown) => ({
      ok: false as const,
      error: cause instanceof Error ? cause.message : "Analisis gagal",
    }));

    if (!result.ok) {
      setError(result.error);
      setPhase("failed");
      return;
    }
    setJobId(result.jobId);
    await drive(result.jobId);
  }, [projectId, drive]);

  useEffect(() => {
    if (resume || started.current) return; // mount ganda (StrictMode) tidak boleh memicu 2 analisis
    started.current = true;
    void begin();
  }, [resume, begin]);

  const percent = Math.round((completed / STAGE_COUNT) * 100);
  const running = phase === "running";
  const currentTitle = STAGES[Math.min(completed, STAGE_COUNT - 1)].title;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">
            {phase === "done"
              ? "Selesai"
              : `Tahap ${Math.min(completed + 1, STAGE_COUNT)} dari ${STAGE_COUNT}`}
          </span>
          <span className="text-primary font-semibold">{percent}%</span>
        </div>
        <div className="bg-border h-2 overflow-hidden rounded-full">
          <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="bg-card divide-y overflow-hidden rounded-[10px] border">
        {STAGES.map((item, index) => {
          const isDone = index < completed;
          const isCurrent = running && index === completed;
          const isFailed = phase === "failed" && index === completed;

          return (
            <div
              key={item.key}
              className={cn(
                "flex items-center gap-3.5 px-4.5 py-4",
                isCurrent && "bg-primary-soft",
                isFailed && "bg-danger-subtle",
              )}
            >
              {isDone ? (
                <CircleCheck className="text-success size-[18px] shrink-0" />
              ) : isFailed ? (
                <TriangleAlert className="text-danger size-[18px] shrink-0" />
              ) : isCurrent ? (
                <Loader className="text-primary size-[18px] shrink-0 animate-spin" />
              ) : (
                <Circle className="text-border-strong size-[18px] shrink-0" />
              )}

              <div className="min-w-0 flex-1 space-y-0.5">
                <p className={cn("text-sm font-semibold", !isDone && !isCurrent && !isFailed && "text-muted-foreground")}>
                  {item.title}
                </p>
                <p className="text-muted-foreground text-xs">{item.detail}</p>
              </div>

              <span
                className={cn(
                  "shrink-0 text-xs font-medium",
                  isDone && "text-success",
                  isCurrent && "text-primary",
                  isFailed && "text-danger",
                  !isDone && !isCurrent && !isFailed && "text-muted-foreground",
                )}
              >
                {isDone ? "Selesai" : isFailed ? "Gagal" : isCurrent ? "Sedang berjalan" : "Menunggu"}
              </span>
            </div>
          );
        })}
      </div>

      {phase === "ready" && (
        <div className="bg-warning-soft space-y-3 rounded-lg p-4">
          <p className="text-warning-strong text-[13px] font-semibold">
            Analisis sebelumnya berhenti di tahap “{currentTitle}”
          </p>
          <p className="text-warning-strong text-xs">
            {error ? `${error} ` : ""}Hasil {completed} tahap pertama masih tersimpan — Anda bisa melanjutkan dari
            tahap yang tertunda tanpa mengulang dari awal.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => jobId && void drive(jobId)}>
              Lanjutkan dari tahap {completed + 1}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void begin()}>
              Mulai ulang
            </Button>
          </div>
        </div>
      )}

      {phase === "failed" && (
        <div className="bg-danger-subtle border-danger-border space-y-3 rounded-lg border p-4">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="text-danger mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-danger text-[13px] font-semibold">
                Tahap “{currentTitle}” gagal
              </p>
              <p className="text-danger text-xs">{error}</p>
              <p className="text-muted-foreground text-xs">
                Tidak ada harga yang dibuat.{" "}
                {completed > 0 && `Hasil ${completed} tahap sebelumnya tersimpan; mengulang hanya menjalankan tahap ini. `}
                Jika penyebabnya konfigurasi AI, perbaiki di Settings dulu.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => (jobId ? void drive(jobId) : void begin())}>
              {jobId ? "Ulangi tahap ini" : "Coba lagi"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/settings")}>
              Buka Settings
            </Button>
          </div>
        </div>
      )}

      {(phase === "running" || phase === "done") && (
        <div className="bg-info-soft flex items-start gap-2.5 rounded-lg p-3.5">
          <Info className="text-info mt-px size-4 shrink-0" />
          <p className="text-info text-xs">
            AI hanya memecah dan menilai tugas. Harga akhir selalu ditetapkan oleh mesin harga aplikasi
            berdasarkan pricing profile Anda.
          </p>
        </div>
      )}
    </>
  );
}
