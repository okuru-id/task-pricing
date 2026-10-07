const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatIDR(value: number): string {
  return idr.format(value);
}

/**
 * Versi ringkas untuk kolom sempit di mobile: "Rp18,6 jt", "Rp1,2 M".
 * Angka penuh tetap dipakai di layar lebar dan di quotation — ini hanya untuk tampilan padat.
 */
export function formatIDRShort(value: number): string {
  const satuan: [number, string][] = [
    [1_000_000_000, "M"],
    [1_000_000, "jt"],
    [1_000, "rb"],
  ];

  for (const [batas, label] of satuan) {
    if (Math.abs(value) >= batas) {
      const angka = value / batas;
      // Satu desimal hanya bila berarti: 18,6 jt tapi 20 jt (bukan 20,0 jt).
      const teks = angka >= 100 || Number.isInteger(angka) ? angka.toFixed(0) : angka.toFixed(1);
      return `Rp${teks.replace(".", ",")} ${label}`;
    }
  }

  return formatIDR(value);
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
