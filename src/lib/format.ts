const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatIDR(value: number): string {
  return idr.format(value);
}

/** "Rp1.500.000 – Rp2.000.000" untuk task Very Complex (§2). */
export function formatRange(min: number, max: number): string {
  return `${formatIDR(min)} – ${formatIDR(max)}`;
}

export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value);
}

/** "Hari ini" / "Kemarin" / "3 hari lalu" untuk kolom Diperbarui di dashboard. */
export function formatRelativeDay(value: Date): string {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const days = Math.round((startOfDay(new Date()) - startOfDay(value)) / 86_400_000);

  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 30) return `${days} hari lalu`;
  return formatDate(value);
}
