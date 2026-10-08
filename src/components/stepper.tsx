import Link from "next/link";

import { cn } from "@/lib/utils";

export const ESTIMATION_STEPS = [
  "Input",
  "Review Task",
  "Milestone",
  "Klarifikasi",
  "Pengaturan",
  "Penawaran",
] as const;

export type EstimationStep = (typeof ESTIMATION_STEPS)[number];

/**
 * Rute tiap tahap. `null` = tanpa halaman (tidak bisa diklik).
 * Bila projectId ada (proyek sudah dibuat), semua tahap yang punya rute
 * bisa diklik maju/mundur.
 */
const STEP_HREFS: Record<EstimationStep, ((projectId: string) => string) | null> = {
  Input: (id) => (id ? `/projects/${id}/requirement` : "/estimations/new"),
  "Review Task": (id) => `/projects/${id}`,
  Milestone: (id) => `/projects/${id}/milestone`,
  Klarifikasi: (id) => `/projects/${id}/clarification`,
  Pengaturan: null,
  Penawaran: (id) => `/projects/${id}/quotation`,
};

export function Stepper({
  current,
  projectId,
}: {
  current: EstimationStep;
  /** Bila diisi, tahap yang sudah dilewati menjadi link navigasi. */
  projectId?: string;
}) {
  const currentIndex = ESTIMATION_STEPS.indexOf(current);

  return (
    <nav
      aria-label="Progres estimasi"
      className="flex items-center gap-1 overflow-x-auto px-1.5 py-2 sm:gap-1.5"
    >
      {ESTIMATION_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const isCurrent = index === currentIndex;
        const resolveHref = STEP_HREFS[step];
        const href =
          projectId && resolveHref && !isCurrent ? resolveHref(projectId) : undefined;
        const clickable = href !== undefined;

        const circle = (
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px]",
              done && "bg-primary text-primary-foreground",
              isCurrent && "relative bg-primary-soft text-primary font-bold",
              !done && !isCurrent && "bg-muted text-muted-foreground font-medium",
            )}
          >
            {isCurrent && (
              <span
                aria-hidden="true"
                className="border-primary absolute -inset-1 rounded-full border-2 border-dashed motion-safe:animate-[spin_4s_linear_infinite]"
              />
            )}
            <span className="relative">{index + 1}</span>
          </span>
        );

        const label = (
          <span
            className={cn(
              "whitespace-nowrap text-xs",
              done && "text-muted-foreground font-medium",
              isCurrent && "text-primary font-semibold",
              !done && !isCurrent && "text-muted-foreground/60",
            )}
          >
            {step}
          </span>
        );

        return (
          <span key={step} className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-1 h-px w-4 sm:w-8",
                  index <= currentIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
            {clickable ? (
              <Link
                href={href}
                className={cn(
                  "flex items-center rounded-md transition hover:opacity-80",
                  isCurrent ? "gap-3" : "gap-1.5",
                )}
                title={isCurrent ? undefined : `Ke ${step}`}
              >
                {circle}
                {label}
              </Link>
            ) : (
              <span
                className={cn("flex items-center", isCurrent ? "gap-3" : "gap-1.5")}
                aria-current={isCurrent ? "step" : undefined}
              >
                {circle}
                {label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
