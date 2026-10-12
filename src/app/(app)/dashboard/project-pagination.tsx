"use client";

import { useId } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_PAGE_SIZES } from "@/lib/data/projects";
import { cn } from "@/lib/utils";

/**
 * Bar pagination ala shadcn dashboard-01 di bawah datatable.
 * Navigasi lewat query param (?page=&pageSize=) sehingga datanya
 * tetap diambil server-side per halaman.
 */
export function ProjectPagination({
  page,
  pageSize,
  total,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rowsPerPageId = useId();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const go = (next: { page?: number; pageSize?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next.page ?? page));
    params.set("pageSize", String(next.pageSize ?? pageSize));
    router.push(`${pathname}?${params.toString()}`);
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <p className="text-muted-foreground hidden flex-1 text-sm lg:block">
        Menampilkan {from}–{to} dari {total} project
      </p>

      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <label htmlFor={rowsPerPageId} className="text-sm font-medium">
            Baris per halaman
          </label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => value && go({ page: 1, pageSize: Number(value) })}
          >
            <SelectTrigger size="sm" id={rowsPerPageId} className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PROJECT_PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="flex w-fit items-center justify-center text-sm font-medium">
          Halaman {page} dari {totalPages}
        </p>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 lg:flex"
            disabled={page <= 1}
            onClick={() => go({ page: 1 })}
            aria-label="Ke halaman pertama"
          >
            <span className="sr-only">Ke halaman pertama</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page <= 1}
            onClick={() => go({ page: page - 1 })}
            aria-label="Ke halaman sebelumnya"
          >
            <span className="sr-only">Ke halaman sebelumnya</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page >= totalPages}
            onClick={() => go({ page: page + 1 })}
            aria-label="Ke halaman berikutnya"
          >
            <span className="sr-only">Ke halaman berikutnya</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 lg:flex"
            disabled={page >= totalPages}
            onClick={() => go({ page: totalPages })}
            aria-label="Ke halaman terakhir"
          >
            <span className="sr-only">Ke halaman terakhir</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
