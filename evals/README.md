# Evaluasi AI & Release Gate

Eval menjalankan pipeline bertahap yang sama dengan aplikasi (4 tahap AI berurutan per kasus, jadi ~4 panggilan model per kasus).

Golden set ada di `evals/golden/*.json` (array `GoldenCase`, lihat `src/lib/eval/metrics.ts`).

- `seed.json` hanya **contoh format** dan belum dilabeli reviewer (`labelledBy: []`).
- Syarat rilis (§5 PRD): ≥ 50 kasus, tiap kasus dilabeli ≥ 2 reviewer. Runner menolak menyatakan
  "layak rilis" sebelum syarat itu terpenuhi, apa pun skornya.

## Menjalankan

```bash
# konfigurasi AI dibaca dari Settings workspace (DB), bukan env: sebutkan workspace-nya
npm run eval -- --workspace=<id>                    # skor + cek ambang + bandingkan dengan baseline
npm run eval -- --workspace=<id> --update-baseline   # simpan skor sebagai baseline setelah ganti model/prompt yang disetujui
```

Exit code 1 jika ada ambang gagal atau regresi > 5 poin dari `evals/baseline.json`.
Jalankan ulang tiap mengganti model atau prompt.

Ambang: complexity accuracy ≥ 85%, extraction recall ≥ 95%, flag precision ≥ 90%,
schema validity ≥ 98%, hallucination = 0.

Catatan definisi: *schema validity* = kasus yang menghasilkan output valid (setelah 1× auto-retry);
*hallucination* = task yang tidak cocok label manapun dan tidak berbagi kata bermakna dengan requirement
(heuristik konservatif — review manual tetap diperlukan).
