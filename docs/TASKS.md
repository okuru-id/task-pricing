# TaskPricer — Breakdown Task Pekerjaan

> Diturunkan dari [taskpricer-prd-v2.md](taskpricer-prd-v2.md) (sumber utama) dan [taskpricer-prd.md](taskpricer-prd.md). Referensi `§n` = nomor section di PRD v2.

Status: fondasi + alur Input → Analisis AI sudah berjalan end-to-end dan terverifikasi dengan data nyata.
Berikutnya: Task Review, Klarifikasi, Quotation.

Setup lokal: Postgres jalan di Docker (`taskpricer-db`, port 5433). Jalankan `npm run dev`, `npm run test:run`.

---

## MVP — Must Have

### 1. Auth & Workspace (§4 Multi-Tenancy, Integration Points) — SELESAI sebagian
- [x] Auth.js v5 dengan Credentials (email+password); Google OAuth aktif otomatis jika `AUTH_GOOGLE_ID/SECRET` diisi
- [x] Auto-create `workspace` + `workspace_members` (OWNER) + pricing profile default saat sign up
- [x] `requireScope()` di `src/lib/workspace.ts` sebagai satu-satunya pintu masuk query ber-scope `workspace_id`
- [ ] Email magic link (butuh Resend/SMTP — digabung dengan Email quotation di v1.1)
- [ ] Test otomatis cross-tenant: akses project workspace lain → 404
- [ ] Rate limit endpoint AI (20 analisis/jam/workspace) (§4 Security)

### 2. Database (§4 Data Model) — SELESAI
- [x] Postgres lokal via Docker + `DATABASE_URL`
- [x] Migrasi awal + `updatedAt` dari `prisma/schema.prisma`
- [x] Pricing profile default (Freelance Standard: Simple 100K / Medium 200K / Complex 300K)

### 3. Dashboard (§2 Main Screens) — SELESAI
- [x] Project list: klien, nilai, status, filter by status
- [x] KPI: revenue bulan ini, project aktif, tingkat diterima, rata-rata nilai
- [x] Chart 6 bulan + pipeline per status + tombol New Estimation

### 4. New Estimation — input requirement (§2) — SELESAI
- [x] Form: nama project, klien, textarea requirement
- [x] Autosave draft tiap 10 detik ke `estimations`

### 5. AI Pipeline (§3) — SELESAI
- [x] Integrasi Vercel AI SDK (OpenAI / OpenAI-compatible / Ollama)
- [x] Zod schema structured output (`tasks[]`, `assumptions[]`, `milestones_suggestion[]`)
- [x] Structured output lewat **tool call terpaksa** — `response_format: json_schema` diabaikan banyak gateway
- [x] Auto-retry 1x; jika tetap gagal → error jelas, **tanpa** membuat harga palsu (terverifikasi)
- [x] Guardrails: auto-flag third-party/migrasi, Very Complex wajib range + ≥1 pertanyaan, confidence low → CLARIFICATION_REQUIRED
- [x] UI progress 5 tahap
- [ ] UI Settings untuk `ai_configs` (provider/model/temperature/system prompt) — sementara lewat `.env`
- [ ] Progress per tahap yang benar-benar granular (saat ini satu panggilan AI, tahap ditampilkan maju otomatis)

> **Catatan provider (penting):** `@ai-sdk/openai` default memakai Responses API. Kode memakai
> `.chat()` agar lewat `/v1/chat/completions`. Ada pula `sanitizingFetch` di `src/lib/ai/provider.ts`
> untuk gateway yang membalas non-streaming dengan `text/event-stream` + `data: [DONE]`.
> Diagnosa provider: `npx tsx --env-file=.env scripts/probe-ai.mts`.

### 6. Pricing Engine — SELESAI
- [x] Terhubung ke `pricing_profiles`/`pricing_rules` per workspace, fallback ke default
- [x] `VERY_COMPLEX` wajib `custom_estimate_min/max`, menolak range terbalik
- [x] Unit test (16 test lulus)
- [ ] Snapshot harga ke `quotation_items` saat quotation dibuat (menyusul bersama Quotation)

### 7. Task Review UI (§2) — SELESAI
- [x] Tabel task: nama, tipe, kompleksitas, flag, confidence, harga + baris expand
- [x] Editable: nama, tipe, kompleksitas, flag, rincian langkah, pertanyaan, range custom
- [x] Harga **selalu** dihitung ulang di server dari complexity — angka dari client diabaikan
- [x] Total live di panel ringkasan; `edited = true` tersimpan (untuk KPI §1)
- [x] Tambah/hapus task, warning "harga masih indikatif", halaman Lihat Requirement
- [x] Auto-flag third-party/migrasi (dikerjakan di guardrail AI, lihat §5)
- [ ] Reorder task (drag) dan field `description`/`priority` belum diekspos di UI

### 8. Clarification (§2)
- [ ] List pertanyaan klarifikasi per task; user bisa edit/hapus/tambah
- [ ] Tombol "Copy all"
- [ ] `VERY_COMPLEX` wajib minimal 1 pertanyaan klarifikasi (§2 US4)

### 9. Quotation (§2)
- [ ] 3 mode: Detailed / Summary / Client Friendly (tanpa istilah teknis)
- [ ] Assumptions + scope exclusions tampil otomatis di quotation
- [ ] Generate PDF server-side via `@react-pdf/renderer` (< 5 detik)
- [ ] Tombol "Copy Customer Summary" → teks WhatsApp bahasa Indonesia, tanpa istilah teknis
- [ ] Simpan snapshot harga (`price`, `currency`, `profile_id`, `profile_version`) per item

### 10. Project Lifecycle & History (§2)
- [ ] Status flow: Draft → Analyzed → Quoted → Accepted/Rejected → Completed → Archived
- [ ] Soft delete project & quotation (audit trail)
- [ ] Halaman History/riwayat project

---

## v1.1 — Should Have (backlog setelah MVP, §5)
- [ ] Multiple pricing profiles penuh (switch per project) + UI assumptions/exclusions
- [ ] Milestone generator (saran AI berdasarkan module/dependency)
- [ ] Quotation versioning + diff antar versi
- [ ] Email quotation (Resend/SMTP), template quotation multiple

## v2.0 — Phase 2–3 (backlog, §5)
- [ ] Change Request workflow (flag `CHANGE_REQUEST`, bandingkan vs original scope)
- [ ] Analytics: avg project value, win rate, estimate accuracy, complexity distribution
- [ ] Team/organization multi-member + RBAC (role member/viewer)
- [ ] AI provider management UI + local LLM onboarding
- [ ] Multi-format input (PDF/DOCX/XLSX)
- [ ] Billing SaaS (Midtrans/Xendit/Stripe)

## Evaluation & Release Gate (§3, §5 — wajib sebelum rilis)
- [ ] Golden set: 50 requirement berlabel (2 reviewer) untuk benchmark complexity/extraction/flag
- [ ] Script eval offline (Vitest + fixture): complexity accuracy ≥ 85%, extraction recall ≥ 95%, flag precision ≥ 90%, hallucination = 0, schema validity ≥ 98%
- [ ] Regression check: jalankan golden set tiap ganti model/prompt, skor tidak boleh turun > 5 poin
