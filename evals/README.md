# Evaluasi AI & Release Gate

Eval menjalankan pipeline bertahap yang sama dengan aplikasi (4 tahap AI berurutan per kasus, jadi ~4 panggilan model per kasus).

Golden set ada di `evals/golden/*.json` (array `GoldenCase`, lihat `src/lib/eval/metrics.ts`).

## Status golden set

`v1.json` berisi 53 kasus requirement berbahasa Indonesia dengan **label draft** (`"draft": true`,
`labelledBy: []`). Label itu disusun sebagai titik awal, **bukan** label resmi.

Syarat rilis (§5 PRD): ≥ 50 kasus, tiap kasus dilabeli ≥ 2 reviewer manusia. Runner menolak
menyatakan "layak rilis" selama `labelledBy` belum terisi 2 nama, apa pun skornya.

### Cara mereview satu kasus

1. Baca `requirement`, bayangkan Anda yang mengerjakan project itu.
2. Lihat keluaran model sungguhan sebagai pembanding:
   `npm run eval -- --workspace=<id> --limit=5 --show`
3. Perbaiki `expectedTasks`: `keywords` (kata yang pasti muncul di nama/alasan/rincian task),
   `complexity`, dan `flags`.
4. Tambahkan nama Anda ke `labelledBy`, dan hapus `"draft": true` begitu dua reviewer setuju.

Catatan pelabelan flag: beberapa flag ditambahkan guardrail secara otomatis
(`src/lib/ai/analyze.ts`) — `THIRD_PARTY_DEPENDENCY` untuk kata kunci pihak ketiga,
`DATA_MIGRATION` untuk migrasi, `COMPLEX_REVIEW` untuk setiap Very Complex. Flag itu **harus**
ikut ditulis di label, kalau tidak akan terhitung sebagai false positive dan menjatuhkan
flag precision.

## Menjalankan

```bash
# konfigurasi AI dibaca dari Settings workspace (DB), bukan env: sebutkan workspace-nya
npm run eval -- --workspace=<id>                     # skor + cek ambang + bandingkan dengan baseline
npm run eval -- --workspace=<id> --limit=5 --show    # uji cepat & murah, tampilkan keluaran model
npm run eval -- --workspace=<id> --update-baseline    # simpan skor sebagai baseline setelah ganti model/prompt yang disetujui
```

`--limit=N` hanya untuk uji cepat: hasilnya ditandai parsial, tidak bisa jadi baseline maupun
bukti rilis. Label yang rusak (complexity/flag salah tulis, id ganda, keyword kosong) dicek
sebelum model dipanggil, supaya tidak membayar 4 panggilan per kasus untuk label cacat.

Exit code 1 jika ada ambang gagal atau regresi > 5 poin dari `evals/baseline.json`.
Jalankan ulang tiap mengganti model atau prompt.

Ambang: complexity accuracy ≥ 85%, extraction recall ≥ 95%, flag precision ≥ 90%,
schema validity ≥ 98%, hallucination = 0.

Catatan definisi: *schema validity* = kasus yang menghasilkan output valid (setelah 1× auto-retry);
*hallucination* = task yang tidak cocok label manapun dan tidak berbagi kata bermakna dengan requirement
(heuristik konservatif — review manual tetap diperlukan).
