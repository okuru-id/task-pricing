import { ChevronRight } from "lucide-react";

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

export function Stepper({ current }: { current: EstimationStep }) {
  const currentIndex = ESTIMATION_STEPS.indexOf(current);

  return (
    <nav className="flex flex-wrap items-center gap-2.5 text-xs">
      {ESTIMATION_STEPS.map((step, index) => (
        <span key={step} className="flex items-center gap-2.5">
          {index > 0 && <ChevronRight className="text-muted-foreground size-3" />}
          <span
            className={cn(
              "flex items-center gap-1.5",
              index < currentIndex && "text-muted-foreground",
              index === currentIndex && "text-primary font-semibold",
              index > currentIndex && "text-muted-foreground/60",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full text-[10px]",
                index < currentIndex && "bg-success text-white",
                index === currentIndex && "bg-primary text-white",
                index > currentIndex && "bg-muted",
              )}
            >
              {index < currentIndex ? "✓" : index + 1}
            </span>
            {step}
          </span>
        </span>
      ))}
    </nav>
  );
}
