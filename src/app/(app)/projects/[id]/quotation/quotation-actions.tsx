"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, FilePlus2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { deleteQuotation } from "../lifecycle-actions";
import { createQuotation } from "./actions";

export function CreateQuotationButton({
  projectId,
  hasExisting,
}: {
  projectId: string;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const create = () =>
    startTransition(async () => {
      const result = await createQuotation(projectId);
      if (result.ok) {
        toast.success("Penawaran dibuat");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <Button size="sm" onClick={create} disabled={pending}>
      <FilePlus2 className="size-3.5" />
      {pending ? "Membuat…" : hasExisting ? "Buat versi baru" : "Buat penawaran"}
    </Button>
  );
}

export function CopySummaryButton({ text }: { text: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Ringkasan untuk pelanggan disalin");
    } catch {
      toast.error("Gagal menyalin — izinkan akses clipboard di browser");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      <Copy className="size-3.5" />
      Copy Customer Summary
    </Button>
  );
}

export function DeleteQuotationButton({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!window.confirm("Hapus versi penawaran ini? Tetap tercatat di History.")) return;
    startTransition(async () => {
      const result = await deleteQuotation(quotationId);
      if (result.ok) {
        toast.success("Penawaran dihapus");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Button variant="outline" size="sm" className="text-danger" onClick={remove} disabled={pending}>
      <Trash2 className="size-3.5" />
      Hapus versi
    </Button>
  );
}
