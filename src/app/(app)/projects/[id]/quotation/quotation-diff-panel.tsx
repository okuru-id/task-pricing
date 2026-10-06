import type { Complexity } from "@prisma/client";

import { COMPLEXITY_LABEL } from "@/lib/labels";
import { diffQuotations, type DiffItem, type DiffQuotation } from "@/lib/quotation-diff";
import { formatIDR } from "@/lib/format";
import { formatItemPrice } from "@/lib/quotation";
import { cn } from "@/lib/utils";

interface Side {
  version: number;
  data: DiffQuotation;
}

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatIDR(Math.abs(value))}`;

function Group({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "add" | "remove" | "change";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3
        className={cn(
          "text-xs font-semibold",
          tone === "add" && "text-success",
          tone === "remove" && "text-danger",
          tone === "change" && "text-warning-strong",
        )}
      >
        {title}
      </h3>
      <ul className="divide-y text-[13px]">{children}</ul>
    </section>
  );
}

const Line = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <li className={cn("flex justify-between gap-4 py-1.5", muted && "text-muted-foreground")}>
    <span>{label}</span>
    <span className="shrink-0 tabular-nums">{value}</span>
  </li>
);

const itemValue = (item: DiffItem) => formatItemPrice(item);

const complexityText = (value: Complexity | null) => (value ? COMPLEXITY_LABEL[value] : "—");

function TextChanges({ title, added, removed }: { title: string; added: string[]; removed: string[] }) {
  if (added.length + removed.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-semibold">{title}</h3>
      <ul className="space-y-1 text-[13px]">
        {added.map((text) => (
          <li key={`+${text}`} className="text-success">+ {text}</li>
        ))}
        {removed.map((text) => (
          <li key={`-${text}`} className="text-danger line-through">− {text}</li>
        ))}
      </ul>
    </section>
  );
}

/** Perubahan dari versi `before` ke `after` — dirender di server, tanpa state. */
export function QuotationDiffPanel({ before, after }: { before: Side; after: Side }) {
  const diff = diffQuotations(before.data, after.data);

  return (
    <section className="bg-card space-y-4 rounded-[10px] border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">
          Perubahan v{before.version} → v{after.version}
        </h2>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            diff.deltaMin > 0 && "text-danger",
            diff.deltaMin < 0 && "text-success",
          )}
          title="Selisih batas bawah total"
        >
          {signed(diff.deltaMin)}
          {diff.deltaMax !== diff.deltaMin && ` s/d ${signed(diff.deltaMax)}`}
        </span>
      </div>

      {!diff.hasChanges && (
        <p className="text-muted-foreground text-[13px]">Tidak ada perbedaan antara kedua versi.</p>
      )}

      {diff.added.length > 0 && (
        <Group title={`Ditambahkan (${diff.added.length})`} tone="add">
          {diff.added.map((item, i) => (
            <Line key={`${item.name}-${i}`} label={item.name} value={itemValue(item)} />
          ))}
        </Group>
      )}

      {diff.removed.length > 0 && (
        <Group title={`Dihapus (${diff.removed.length})`} tone="remove">
          {diff.removed.map((item, i) => (
            <Line key={`${item.name}-${i}`} label={item.name} value={itemValue(item)} muted />
          ))}
        </Group>
      )}

      {diff.changed.length > 0 && (
        <Group title={`Berubah (${diff.changed.length})`} tone="change">
          {diff.changed.map(({ name, before: b, after: a }, i) => (
            <li key={`${name}-${i}`} className="space-y-0.5 py-1.5">
              <div className="flex justify-between gap-4">
                <span>{name}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-muted-foreground line-through">{itemValue(b)}</span> → {itemValue(a)}
                </span>
              </div>
              {b.complexity !== a.complexity && (
                <p className="text-muted-foreground text-xs">
                  Kompleksitas {complexityText(b.complexity)} → {complexityText(a.complexity)}
                </p>
              )}
            </li>
          ))}
        </Group>
      )}

      {diff.unchanged > 0 && (
        <p className="text-muted-foreground text-xs">{diff.unchanged} item tidak berubah.</p>
      )}

      <TextChanges title="Asumsi" {...diff.assumptions} />
      <TextChanges title="Pengecualian" {...diff.exclusions} />
    </section>
  );
}
