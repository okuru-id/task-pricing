"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Jaring pengaman untuk error yang lolos dari page maupun layout `(app)` —
 * termasuk database tidak terjangkau, yang dilempar `requireScope()` sebelum
 * satu pun UI dirender. Tanpa file ini Next.js menampilkan stack trace (dev)
 * atau halaman "Application error" tanpa konteks (production).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Penyebab sebenarnya hanya ada di server log; digest adalah penghubungnya.
    console.error("Halaman gagal dirender:", error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className="bg-warning-soft mx-auto flex size-12 items-center justify-center rounded-full">
          <TriangleAlert className="text-warning size-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Halaman ini gagal dimuat</h1>
          <p className="text-muted-foreground text-[13px]">
            Sebagian layanan sedang tidak bisa dihubungi — sering kali database atau provider
            AI. Data Anda tidak terpengaruh; coba muat ulang sebentar lagi.
          </p>
        </div>

        {/* Pesan asli hanya berguna saat pengembangan; di production Next.js menyensornya. */}
        {process.env.NODE_ENV !== "production" && (
          <p className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-left font-mono text-xs break-words">
            {error.message}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="max-sm:h-10">
            <RefreshCw className="size-4" />
            Coba lagi
          </Button>
          <Link
            href="/dashboard"
            className="bg-card hover:bg-muted flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium max-sm:h-10"
          >
            Ke Dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="text-muted-foreground text-xs">
            Kode kejadian: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
