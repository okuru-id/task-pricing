import type { Complexity, QuotationMode, TaskType } from "@prisma/client";

import { ComplexityBadge } from "@/components/task-badges";
import { TASK_TYPE_LABEL } from "@/lib/labels";
import { formatItemPrice, formatTotal, groupByType } from "@/lib/quotation";

interface Item {
  id: string;
  name: string;
  type: TaskType | null;
  complexity: Complexity | null;
  breakdown: string[];
  price: number;
  priceMax: number | null;
}

interface QuotationData {
  total: number;
  totalMax: number | null;
  assumptions: string[];
  exclusions: string[];
  items: Item[];
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-semibold">{title}</h2>
      <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-[13px]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Row({ name, price, children }: { name: string; price: string; children?: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3 text-[13px]">
      <div className="min-w-0 space-y-1.5">
        <p className="font-medium">{name}</p>
        {children}
      </div>
      <span className="shrink-0 font-semibold tabular-nums">{price}</span>
    </li>
  );
}

export function QuotationView({ mode, quotation }: { mode: QuotationMode; quotation: QuotationData }) {
  const clientFriendly = mode === "CLIENT_FRIENDLY";

  return (
    <article className="bg-card space-y-6 rounded-[10px] border p-6">
      {mode === "DETAILED" && (
        <ul className="divide-y">
          {quotation.items.map((item) => (
            <Row key={item.id} name={item.name} price={formatItemPrice(item)}>
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                {item.type && <span>{TASK_TYPE_LABEL[item.type]}</span>}
                {item.complexity && <ComplexityBadge value={item.complexity} />}
              </div>
              {item.breakdown.length > 0 && (
                <ol className="text-muted-foreground list-decimal space-y-0.5 pl-5 text-xs">
                  {item.breakdown.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </Row>
          ))}
        </ul>
      )}

      {mode === "SUMMARY" &&
        groupByType(quotation.items).map((group) => (
          <section key={group.type} className="space-y-1">
            <div className="flex justify-between text-[13px] font-semibold">
              <h2>{group.label}</h2>
              <span className="tabular-nums">
                {formatItemPrice({ price: group.subtotal, priceMax: group.subtotalMax })}
              </span>
            </div>
            <ul className="divide-y">
              {group.items.map((item) => (
                <Row key={item.id} name={item.name} price={formatItemPrice(item)} />
              ))}
            </ul>
          </section>
        ))}

      {/* Client Friendly: hanya nama pekerjaan dan harga — tanpa tipe, kompleksitas, flag. */}
      {clientFriendly && (
        <ul className="divide-y">
          {quotation.items.map((item) => (
            <Row key={item.id} name={item.name} price={formatItemPrice(item)} />
          ))}
        </ul>
      )}

      <div className="flex items-baseline justify-between border-t pt-4">
        <span className="text-[13px] font-semibold">
          {clientFriendly ? "Total estimasi biaya" : "Total"}
        </span>
        <span className="text-xl font-bold tabular-nums">{formatTotal(quotation)}</span>
      </div>

      <Bullets title={clientFriendly ? "Yang kami asumsikan" : "Asumsi"} items={quotation.assumptions} />
      <Bullets title={clientFriendly ? "Yang tidak termasuk" : "Pengecualian (scope exclusions)"} items={quotation.exclusions} />
    </article>
  );
}
