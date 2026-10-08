import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

interface StepNavProps {
  backHref?: string | null;
  backLabel?: string;
  nextHref?: string | null;
  nextLabel?: string;
  nextDisabled?: boolean;
}

/**
 * Navigasi bawah standar untuk semua halaman stepper.
 * Kiri: tombol kembali (outline). Kanan: tombol lanjut (primary).
 * Bila salah satu sisi null, diberi spacer agar sisi lain tetap rata.
 */
export function StepNav({
  backHref = null,
  backLabel = "Kembali",
  nextHref = null,
  nextLabel = "Lanjut",
  nextDisabled = false,
}: StepNavProps) {
  return (
    <div className="flex justify-between">
      {backHref ? (
        <Link
          href={backHref}
          className="bg-card hover:bg-muted flex h-8 items-center rounded-md border px-3 text-[13px] font-medium"
        >
          {backLabel}
        </Link>
      ) : (
        <span />
      )}
      {nextDisabled ? (
        <Button disabled>{nextLabel}</Button>
      ) : nextHref ? (
        <Link href={nextHref} className={buttonVariants()}>
          {nextLabel}
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
