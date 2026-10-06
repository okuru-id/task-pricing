"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Circle, CircleCheck, Info, Loader, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { startAnalysis } from "./actions";

const STAGES = [
  {
    title: "Mengekstrak kebutuhan",
    detail: "Membaca percakapan dan mengenali fitur yang diminta",
  },
  {
    title: "Memecah menjadi tugas",
    detail: "Memisahkan pekerjaan independen menjadi task tersendiri",
  },
  {
    title: "Menilai kompleksitas",
    detail: "Menilai tingkat kesulitan tiap tugas",
  },
  {
    title: "Memetakan dependensi",
    detail: "Menandai risiko, pihak ketiga, dan kebutuhan klarifikasi",
  },
  {
    title: "Menyusun estimasi",
    detail: "Menghitung harga lewat mesin harga aplikasi",
  },
];

/**
 * Analisis berjalan dalam satu panggilan AI. Tahap ditampilkan berjalan maju
 * sampai hasil tiba, lalu semuanya ditandai selesai (§2 Main Screens).
 */
export function AnalysisProgress({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  // Ticker dipisah dari pemicu analisis: di StrictMode effect dijalankan dua kali,
  // dan guard `started` tidak boleh ikut mematikan ticker.
  useEffect(() => {
    if (done || error) return;

    const ticker = setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 2500);

    return () => clearInterval(ticker);
  }, [done, error]);

  useEffect(() => {
    if (started.current) return; // mount ganda tidak boleh memicu 2 analisis
    started.current = true;

    startAnalysis(projectId)
      .then((result) => {
        if (result.ok) {
          setDone(true);
          setStage(STAGES.length);
          router.push(`/projects/${projectId}`);
        } else {
          setError(result.error);
        }
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Analisis gagal");
      });
  }, [projectId, router]);

  const completed = done ? STAGES.length : stage;
  const percent = Math.round((completed / STAGES.length) * 100);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">
            Tahap {Math.min(stage + 1, STAGES.length)} dari {STAGES.length}
          </span>
          <span className="text-primary font-semibold">{percent}%</span>
        </div>
        <div className="bg-border h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="bg-card divide-y overflow-hidden rounded-[10px] border">
        {STAGES.map((item, index) => {
          const isDone = index < completed;
          const isCurrent = !error && !isDone && index === stage;
          const isFailed = Boolean(error) && index === stage;

          return (
            <div
              key={item.title}
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
                <p
                  className={cn(
                    "text-sm font-semibold",
                    !isDone && !isCurrent && !isFailed && "text-muted-foreground",
                  )}
                >
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

      {error ? (
        <div className="bg-danger-subtle border-danger-border space-y-3 rounded-lg border p-4">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="text-danger mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="text-danger text-[13px] font-semibold">Analisis gagal</p>
              <p className="text-danger text-xs">{error}</p>
              <p className="text-muted-foreground text-xs">
                Tidak ada harga yang dibuat. Perbaiki konfigurasi AI di Settings lalu coba lagi.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => window.location.reload()}>
              Coba lagi
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/settings")}>
              Buka Settings
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-info-soft flex items-start gap-2.5 rounded-lg p-3.5">
          <Info className="text-info mt-px size-4 shrink-0" />
          <p className="text-info text-xs">
            AI hanya memecah dan menilai tugas. Harga akhir selalu ditetapkan oleh mesin
            harga aplikasi berdasarkan pricing profile Anda.
          </p>
        </div>
      )}
    </>
  );
}
