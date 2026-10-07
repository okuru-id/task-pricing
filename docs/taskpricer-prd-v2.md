# PRD — TaskPricer: Freelance Task Estimator & Quotation (SaaS)

> Restructured v2. Sumber: `taskpricer-prd.md`. Keputusan: **Next.js + Tailwind CSS**, **SaaS multi-user**, **BYOK** (Bring Your Own Key — API key AI milik user, konfigurasi hanya dari UI/database, tanpa fallback ke environment variable, tanpa kuota analisis).

---

## 1. Executive Summary

### Problem Statement

Freelancer software developer menerima requirement mentah via WhatsApp/email/dokumen yang terlalu umum dan ambigu. Harga ditentukan berdasarkan feeling, sehingga tidak konsisten, sering underprice pada task yang menyembunyikan kompleksitas, dan rentan scope creep.

### Proposed Solution

TaskPricer adalah SaaS AI-assisted yang mengubah requirement mentah menjadi task terstruktur → technical breakdown → complexity classification → harga (dikontrol pricing engine, bukan AI) → pertanyaan klarifikasi → quotation profesional (PDF + ringkasan WhatsApp).

Core flow:

```text
Customer Requirement → Task Extraction → Task Breakdown → Complexity Analysis
→ Risk/Dependency Detection → Pricing Engine → Clarification → Quotation
```

### Success Criteria (KPI Terukur)

| # | KPI | Target | Cara Ukur |
|---|---|---|---|
| 1 | Waktu requirement → quotation | p95 < 5 menit | Timestamp `project.created_at` → `quotation.generated_at` |
| 2 | Akurasi klasifikasi complexity AI | ≥ 85% | Benchmark golden set 50 requirement berlabel (§3) |
| 3 | Task extraction recall | ≥ 95% fitur terdeteksi | Golden set: jumlah fitur terlabel vs fitur terdeteksi AI |
| 4 | Hallucination rate | 0 | Setiap task AI harus traceable ke input; audit sampling manual 20 quotation/bulan |
| 5 | Tingkat edit manual pasca-AI | ≤ 30% task diedit user | Rasio `estimation_tasks.edited = true` per estimation |

---

## 2. User Experience & Functionality

### User Personas

1. **Freelancer Developer (persona utama)** — butuh estimasi cepat (< 5 menit), harga konsisten, quotation profesional berbahasa Indonesia.
2. **IT Consultant** — butuh technical breakdown, risk analysis, effort estimation untuk proposal.
3. **Small Software House** — butuh standard estimasi tim kecil (2–10 orang); memakai fitur team/organization (Phase 3).

### UX Principle

> **Masukkan chat customer → dapatkan quotation.**

Primary action: **New Estimation**. Secondary: History, Pricing, Settings. Terasa seperti tool, bukan project management software.

### Core User Journey

```text
Login → Dashboard → New Estimation → Paste Requirement → AI Analyze
→ Review Breakdown → Adjust Complexity → Calculate Price → Review Flags
→ Customer Questions → Generate Quotation → Export PDF / Copy
```

### Main Screens

| Screen | Isi | Acceptance Criteria |
|---|---|---|
| Dashboard | Project list, client, value, status, tombol New Estimation | List muncul < 500ms; filter by status |
| New Estimation | Input project name, client, paste requirement | Text ≥ 1 karakter; autosave draft tiap 10s |
| AI Analysis | Progress: ✓ extracting → ✓ breakdown → ✓ complexity → ✓ dependencies → ✓ estimate | Streaming status per tahap; gagal 1 tahap → retry tahap itu saja |
| Task Review | Task, type, complexity, price, flags, breakdown, edit | Semua field AI dapat diedit (§14 PRD v1); perubahan harga re-kalkulasi total instan |
| Clarification | Daftar pertanyaan ke customer | User dapat edit/hapus/tambah pertanyaan; copy all |
| Quotation | Estimate, custom range, assumptions, exclusions, tombol PDF/Copy | PDF ter-generate < 5s; Copy to WhatsApp satu klik |

### Input Requirement (MVP: text paste saja)

- Text / paste chat customer — **MVP**.
- PDF, DOCX, XLSX, TXT upload — **future**.

### Task Classification

Setiap task memiliki: `Type`, `Complexity`, `Priority`, `Risk`, `Dependency`, `Confidence`.

**Type**: `Bug`, `Enhancement`, `New Feature`, `Integration`, `Infrastructure`, `Investigation`, `Maintenance`, `Change Request`.

**Complexity**: `Simple`, `Medium`, `Complex`, `Very Complex`.

### Complexity Rules & Pricing Engine

Default pricing (dikontrol **application logic**, bukan AI):

| Complexity | Harga default |
|---|---:|
| Simple | Rp100.000 |
| Medium | Rp200.000 |
| Complex | Rp300.000 |
| Very Complex | Custom (range, diinput user) |

**Mekanisme Very Complex / Custom (gap v1, kini didefinisikan):**

- Jika AI mengklasifikasi `Very Complex`, AI **wajib** mengisi `custom_estimate_min` dan `custom_estimate_max` (estimasi jam × rate user, atau range Rp).
- User review dan boleh mengubah angka sebelum masuk quotation.
- Quotation menampilkan Very Complex sebagai range, bukan angka tunggal.

**Karakteristik tiap level** (ambil dari v1 §11, tidak berubah):

- **Simple (Rp100K)** — scope jelas, perubahan kecil, dependency rendah, risiko regression rendah. Contoh: tambah menu, ubah label, tambah field, button, validation sederhana.
- **Medium (Rp200K)** — frontend + backend, query DB, business logic sederhana, beberapa halaman. Contoh: CRUD relationship, filter tanggal, search/pagination, export data, API endpoint sederhana.
- **Complex (Rp300K)** — beberapa module, business logic penting, DB changes, workflow existing berubah. Contoh: approval workflow, multi-step transaction, complex reporting, billing logic.
- **Very Complex / Custom** — new module, payment integration, external API signifikan, architecture change, large data migration, real-time, AI/ML, > 1 hari dev. **Jangan paksa task besar jadi Rp300K.**

### Flag System

`NO_FLAG`, `CLARIFICATION_REQUIRED`, `COMPLEX_REVIEW`, `THIRD_PARTY_DEPENDENCY`, `DATABASE_REVIEW`, `ARCHITECTURE_REVIEW`, `DATA_MIGRATION`, `CHANGE_REQUEST`. Satu task ≥ 0 flag.

### Human Review (prinsip wajib)

AI tidak pernah mengunci hasil. User dapat mengubah: task name, description, breakdown, type, complexity, price, priority, flag, reason, questions.

### Clarification, Assumptions, Exclusions

- **Clarification questions** — AI hasilkan pertanyaan jika requirement ambigu; user edit/hapus/tambah.
- **Assumptions** — AI catat asumsi (mis. "Existing authentication system is available") untuk cegah dispute scope.
- **Scope exclusions** — user tandai yang tidak termasuk (hosting, domain, third-party fee, migrasi, support pasca-produksi); quotation otomatis tampilkan.

### Quotation

- **Modes**: `Detailed` (semua task) · `Summary` (module + description + price) · `Client Friendly` (tanpa istilah teknis: migration, webhook, middleware, queue).
- **Struktur**: header (logo, nama, company, address, contact, bank), itemized cost, subtotal, discount, total, assumptions, exclusions, signature, terms & conditions.
- **PDF export** — < 5 detik, brandable.
- **Copy to WhatsApp** — satu tombol "Copy Customer Summary" menghasilkan teks ringkas berbahasa Indonesia.
- **Milestone** — untuk project besar, AI sarankan milestone berdasar module/dependency; tiap milestone punya tasks, price, priority, effort.

### Pricing Profiles

Multiple profile per user (Freelance Standard, Corporate, Maintenance, Custom). Tiap profile punya rules sendiri. Pricing rules **versi-snapshot**:

> **Versioning harga (gap v1, kini didefinisikan):** saat quotation dibuat, sistem menyimpan snapshot harga per item ke quotation (immutable). Mengubah pricing profile **tidak** mengubah quotation lama. Diff antar versi quotation tersedia.

### Project Lifecycle

Status: `Draft → Analyzed → Quoted → Accepted / Rejected → Completed → Archived`. Satu project boleh punya banyak versi estimation/quotation. Change request = task baru berflag `CHANGE_REQUEST` dibandingkan dengan original scope.

### User Stories & Acceptance Criteria

**US1 — Freelancer:** Sebagai freelancer, saya mau paste chat customer dan dapat breakdown task + harga, supaya estimasi objektif dan cepat.
- AC: paste requirement ≥ 50 karakter → AI return JSON valid (§3 schema) → task table tampil dalam < 60 detik.
- AC: requirement dengan ≥ 3 fitur terpisah diekstrak menjadi ≥ 3 task (satu kalimat ≠ satu task).

**US2 — Freelancer:** Saya mau edit hasil AI, supaya saya tetap kontrol final.
- AC: semua field task editable; total re-kalkulasi otomatis; hasil edit tersimpan persisten.

**US3 — Freelancer:** Saya mau export quotation PDF + copy ringkasan WhatsApp, supaya bisa kirim ke customer segera.
- AC: PDF berisi header brand, itemized cost, assumptions, exclusions, T&C; ter-download < 5s.
- AC: Copy to WhatsApp menghasilkan teks tanpa istilah teknis, siap paste.

**US4 — IT Consultant:** Saya mau deteksi task yang menyembunyikan kompleksitas, supaya tidak underprice.
- AC: task berkategori payment/migration/integration otomatis mendapat flag minimal `THIRD_PARTY_DEPENDENCY` atau `COMPLEX_REVIEW`.
- AC: complexity `Very Complex` wajib menghasilkan range custom + minimal 1 pertanyaan klarifikasi.

**US5 — Small Software House:** Saya mau multiple pricing profiles, supaya harga konsisten per tipe client.
- AC: profil switchable per project; quotation menyimpan snapshot harga profil saat dibuat.

**US6 — Semua user:** Saya mau melihat riwayat dan status project, supaya bisa follow up.
- AC: dashboard menampilkan count per status + estimated revenue bulan berjalan.

### Non-Goals (MVP)

Bukan: full project management, accounting, invoice system, CRM, ERP, time tracking, source code generator, payment processing.

---

## 3. AI System Requirements

### Tool / Provider Requirements

- **Provider yang didukung**: OpenAI API, OpenAI-compatible API, Ollama / local LLM.
- **BYOK — konfigurasi hanya dari UI/database**: tiap workspace mengisi sendiri di **Settings** → provider, Base URL, model, temperature, system prompt, dan **API key**. Disimpan di `ai_configs`. **Tidak ada default provider/model/key dan tidak ada fallback ke environment variable** (`OPENAI_*`, dsb. tidak dibaca). Biaya pemakaian ditagih langsung oleh provider ke akun user, sehingga aplikasi tidak menerapkan kuota/rate limit analisis.
  - AC: tanpa konfigurasi lengkap, analisis tidak dimulai dan user diarahkan ke Settings (pesan jelas, bukan error teknis).
  - AC: API key dienkripsi at-rest (AES-256-GCM, kunci turunan `AUTH_SECRET`), tidak pernah dikirim kembali ke klien (UI hanya menampilkan 4 karakter terakhir), dan tidak muncul di log. Isi key kosong saat menyimpan = pertahankan key lama; tersedia aksi hapus key.
  - AC: tombol **Tes koneksi** mengirim satu permintaan kecil agar salah key/URL/model ketahuan sebelum analisis.
  - AC: Base URL divalidasi (hanya http/https, tanpa kredensial di URL, alamat metadata cloud ditolak). Localhost diizinkan untuk Ollama/gateway lokal.
- **Library**: Vercel AI SDK (`ai`) — satu antarmuka untuk semua provider di atas, dengan structured output (Zod schema).
- **Custom skill/prompt**: user dapat menambah instruksi global (mis. "Selalu prioritaskan backend complexity", "Gunakan bahasa Indonesia untuk customer").

### AI Architecture

AI **tidak pernah** menentukan harga final.

```text
Requirement Parser → Task Extractor → Task Breaker → Complexity Analyzer
→ Risk Analyzer → [Pricing Engine (application logic)] → Quotation Generator
```

**Eksekusi bertahap**: ekstraksi → breakdown → kompleksitas → dependensi (masing-masing satu panggilan model dengan structured output), lalu tahap estimasi oleh pricing engine tanpa AI. Keluaran tiap tahap disimpan (`analysis_jobs`) sehingga tahap yang gagal diulang sendirian dan analisis yang terhenti bisa dilanjutkan. Tiap tahap wajib menjawab semua task; jawaban parsial dianggap gagal.

### Structured Output (wajib JSON, divalidasi Zod)

```json
{
  "tasks": [
    {
      "name": "Google Login",
      "type": "integration",
      "complexity": "complex",
      "reason": "Requires OAuth integration",
      "flags": ["THIRD_PARTY_DEPENDENCY", "COMPLEX_REVIEW"],
      "breakdown": ["OAuth configuration", "Callback handling", "Account mapping", "Error handling", "Testing"],
      "questions": ["Is OAuth already configured?"],
      "confidence": "medium",
      "custom_estimate_min": null,
      "custom_estimate_max": null
    }
  ],
  "assumptions": ["Existing authentication system is available"],
  "milestones_suggestion": []
}
```

Aturan output: jika informasi tidak tersedia → `Unknown` / `Not specified` / `Needs clarification`. Dilarang mengarang nilai.

### AI Guardrails

AI **tidak boleh**: mengarang requirement; mengasumsikan provider tanpa informasi; memberi harga final jika scope tidak jelas; menghapus task user; mengubah pricing profile; memasukkan provider fee ke development fee; mengklaim estimasi sebagai quotation final saat masih ada uncertainty.

Jika confidence `Low` → tampilkan alasan, harga ditandai **indikatif**, bukan final.

### Evaluation Strategy

| Aspek | Metode | Target |
|---|---|---|
| **Golden set** | 50 requirement nyata berbahasa Indonesia (chat WA, email, bullet list), diberi label task/complexity/flags oleh 2 reviewer | Dibangun sebelum rilis |
| Complexity accuracy | Prediksi vs label | ≥ 85% |
| Extraction recall | Fitur terlabel vs terdeteksi | ≥ 95% |
| Flag precision | Flag relevan / total flag | ≥ 90% |
| Hallucination | Task tanpa landasan di input | 0 (blocking) |
| Schema validity | Output lolos Zod parse tanpa retry | ≥ 98% (1 retry otomatis jika gagal) |
| **Regression check** | Jalankan golden set tiap ganti model/prompt; bandingkan skor | Tidak turun > 5 poin |

Evaluasi dijalankan sebagai script offline (Vitest + fixture), bukan manual.

---

## 4. Technical Specifications

### Architecture Overview

```text
[Browser] ←→ [Next.js App Router (Vercel atau VPS)]
                 ├── UI: React + Tailwind CSS + shadcn/ui
                 ├── API routes / Server Actions
                 ├── Auth: Auth.js (Google OAuth + credentials)
                 ├── AI layer: Vercel AI SDK → OpenAI / compatible / Ollama
                 ├── Pricing Engine (pure TS module, deterministic)
                 └── ORM: Prisma → [PostgreSQL]
                                    [S3-compatible storage: logo, ttd, attachment future]
```

- **Frontend**: Next.js (App Router) + Tailwind CSS + TypeScript + **shadcn/ui**.
- **UI kit**: shadcn/ui — komponen kunci: `Table` (task table), `Form` + react-hook-form + zod (review & settings), `Badge` (flags, complexity), `Select` (complexity/type), `Dialog` (edit task, milestone), `Tabs` (quotation modes), `Accordion` (breakdown per task), `Toast` (copy sukses). Semua komponen di-copy ke repo (bukan dependency), tema via CSS variables Tailwind.
- **Backend**: Next.js API routes / Server Actions. Pricing Engine sebagai pure function terpisah + unit test (AI tidak menyentuh modul ini).
- **Database**: PostgreSQL.
- **PDF**: `@react-pdf/renderer` (server-side, template quotation).
- **AI**: Vercel AI SDK, structured output via Zod.

### Multi-Tenancy (SaaS)

- Model: **workspace per user** sejak MVP. Setiap tabel bisnis punya `workspace_id`. Semua query di-scope `workspace_id` di layer repository/server-action — tidak ada query lintas tenant.
- Team/organization multi-member: **Phase 3** (skema sudah menyediakan `workspace_members` sejak awal, UI menyusul).
- MVP billing SaaS: `TBD` (kandidat: Midtrans / Xendit / Stripe — konfirmasi sebelum implementasi Phase 2). MVP bisa rilis dengan plan manual/free dulu.

### Data Model

```text
users
 └── workspaces
      ├── pricing_profiles ── pricing_rules (versi)
      └── projects (status lifecycle)
           └── estimations
                └── estimation_tasks
                     ├── task_breakdowns
                     ├── task_flags
                     └── clarification_questions
                ├── milestones
                └── quotations (immutable snapshot harga)
                     └── quotation_items
      └── change_requests
```

Tabel: `users`, `workspaces`, `workspace_members`, `pricing_profiles`, `pricing_rules`, `projects`, `estimations`, `estimation_tasks`, `task_breakdowns`, `task_flags`, `clarification_questions`, `milestones`, `quotations`, `quotation_items`, `change_requests`, `ai_configs` (termasuk API key terenkripsi), `analysis_jobs`, `ai_eval_runs`.

Aturan integritas:
- `quotations` immutable setelah dikirim; revisi = quotation versi baru.
- Snapshot harga di `quotation_items` (price, currency, profile_id, profile_version).
- Soft delete untuk project & quotation (audit trail).

### Integration Points

| Integrasi | Teknologi | Kapan |
|---|---|---|
| Auth | Auth.js v5 — Google OAuth + email magic link | MVP |
| AI | Vercel AI SDK (OpenAI / OpenAI-compatible / Ollama) — BYOK, konfigurasi dari Settings (DB) | MVP |
| DB | PostgreSQL (managed — Neon/Supabase/RDS, `TBD` hosting) | MVP |
| Storage | S3-compatible (logo, tanda tangan) | MVP |
| PDF | `@react-pdf/renderer` | MVP |
| Billing SaaS | Midtrans / Xendit / Stripe | `TBD` — Phase 2 |
| Email (kirim quotation) | Resend / SMTP | Phase 2 |

### Security & Privacy

- **Isolasi tenant**: semua query ber-scope `workspace_id`; diuji dengan test khusus lintas-tenant (akses ID project tenant lain → 404).
- **Data sensitif**: requirement customer bisa memuat info bisnis rahasia. Penanganan: TLS in transit, encryption at rest (managed Postgres), retensi data mengikuti kebijakan user (fitur delete permanen project).
- **AI provider (BYOK)**: user memilih provider dan memakai API key miliknya sendiri. Dokumentasikan bahwa data requirement dikirim ke provider pilihan; OpenAI API tier tidak digunakan untuk training (kebijakan API). Opsi Ollama/local untuk data yang tidak boleh keluar. API key terenkripsi at-rest, write-only dari sisi UI, dan hanya didekripsi di server saat memanggil model. Mengganti `AUTH_SECRET` membuat key tersimpan tidak terbaca — user mengisi ulang di Settings. Base URL buatan user divalidasi untuk mencegah SSRF ke endpoint metadata cloud.
- **Auth**: session cookie httpOnly + CSRF protection bawaan Auth.js; **tanpa rate limit/kuota analisis di sisi aplikasi** karena memakai API key milik user (BYOK) — batas pemakaian mengikuti akun provider user. Kegagalan karena limit provider ditampilkan apa adanya dan tahap yang gagal bisa diulang.
- **RBAC**: MVP = 1 owner per workspace. Role member/viewer masuk Phase 3.
- **Compliance**: PDP (UU PDP Indonesia) — consent pengumpulan data, right to delete. Audit log akses quotation.

---

## 5. Risks & Roadmap

### Phased Rollout

**MVP (Must Have)**
- Auth, workspace, dashboard, create project, paste requirement.
- AI extraction, breakdown, complexity classification, flags, clarification questions.
- Pricing configuration + automatic pricing (dengan snapshot), Very Complex custom range.
- Manual editing penuh, total calculation, customer-friendly summary.
- PDF quotation, copy to WhatsApp, project history.

**v1.1 (Should Have)**
- Multiple pricing profiles penuh, milestones, assumptions UI, scope exclusions UI.
- Quotation versioning + diff antar versi.
- Email quotation, template quotation multiple.

**v2.0 (Phase 2–3)**
- Change Request workflow, actual vs estimate, analytics (avg project value, win rate, estimate accuracy, complexity distribution).
- Team/organization multi-member + RBAC.
- Pricing recommendation dari historical data, manajemen multi-provider/fallback provider, local LLM onboarding. (Konfigurasi satu provider per workspace lewat Settings sudah masuk MVP.)
- Multi-format input (PDF/DOCX/XLSX).
- Billing SaaS berlangganan.

**Later (Phase 4)**
- AI pricing optimization & learning dari completed projects, proposal generator, CRM ringan, kolaborasi tim.

### Technical Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Latency & biaya LLM per analisis | UX lambat, margin SaaS tergerus | Streaming progress per tahap; caching per (hash requirement, model, prompt); batas rate per plan; model kecil untuk tahap parser |
| Output JSON tidak valid dari LLM (apalagi Ollama lokal) | Pipeline gagal | Zod strict + 1 auto-retry dengan error feedback; fallback ke provider alternatif; tampilkan error jelas, jangan harga palsu |
| Kualitas model lokal/Ollama untuk bahasa Indonesia rendah | Akurasi turun | Golden set diuji per provider; tampilkan warning confidence di UI untuk provider lokal |
| Data leak lintas tenant | Fatal untuk SaaS | Scope `workspace_id` di satu layer repository + automated cross-tenant test |
| PDF fidelity beda browser/driver | Quotation rusak | Generate server-side (bukan window.print), snapshot test template |
| Scope creep produk sendiri | MVP tidak selesai | Non-Goals §2 dipatuhkan; fitur Should Have tidak boleh masuk MVP release |
| Vendor lock AI provider | Migrasi mahal | Semua call lewat abstraksi Vercel AI SDK; provider = config, bukan kode |

### Kebijakan rilis

- Golden set evaluation wajib hijau sebelum tiap rilis yang mengubah prompt/model.
- MVP dianggap sukses bila seluruh KPI §1 terpenuhi pada 10 user alpha selama 2 minggu.
