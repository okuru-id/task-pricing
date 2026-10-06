# PRD — Freelance Task Estimator & Quotation Tool

## Product Overview

**TaskPricer** adalah aplikasi AI-assisted untuk freelancer software developer, IT consultant, dan software house kecil.

Tujuan utama:

> Mengubah requirement mentah dari customer menjadi task terstruktur, technical breakdown, complexity, pricing, clarification questions, dan quotation.

### Core Flow

```text
Customer Requirement
        ↓
Task Extraction
        ↓
Task Breakdown
        ↓
Complexity Analysis
        ↓
Risk / Dependency Detection
        ↓
Pricing Engine
        ↓
Clarification
        ↓
Quotation
```

## 1. Problem Statement

Freelancer sering menerima requirement melalui WhatsApp, email, dokumen, atau bullet list yang belum terstruktur.

Masalah:

- Task terlalu umum.
- Sulit menentukan harga secara konsisten.
- Scope creep.
- Requirement ambigu.
- Harga sering ditentukan berdasarkan feeling.
- Customer menganggap satu kalimat sebagai satu task, padahal effort teknisnya besar.

TaskPricer membantu membuat proses estimasi lebih objektif dan konsisten.

## 2. Goals

### Primary Goals

1. Mempercepat estimasi pekerjaan.
2. Membuat breakdown task otomatis.
3. Menentukan complexity.
4. Menghitung harga berdasarkan pricing profile.
5. Mendeteksi task yang terlalu kompleks.
6. Mendeteksi requirement ambigu.
7. Menghasilkan pertanyaan klarifikasi.
8. Menghasilkan quotation profesional.

### Secondary Goals

1. Menyimpan history quotation.
2. Membandingkan estimated vs actual effort.
3. Membantu mencegah scope creep.
4. Menyediakan reusable pricing template.
5. Membantu freelancer menjaga konsistensi harga.

## 3. Non Goals

MVP tidak bertujuan menjadi:

- Full project management.
- Accounting software.
- Full invoice system.
- Full CRM.
- ERP.
- Time tracking system.
- Source code generator.

Fokus:

> **Requirement → Breakdown → Estimate → Price → Quotation**

## 4. Target Users

### Freelancer Developer

Membutuhkan estimasi cepat, pricing konsisten, dan quotation profesional.

### IT Consultant

Membutuhkan technical breakdown, risk analysis, dan effort estimation.

### Small Software House

Membutuhkan standard estimation dan quotation workflow.

## 5. Core User Journey

```text
Login
 ↓
Dashboard
 ↓
New Estimation
 ↓
Paste Customer Requirement
 ↓
AI Analyze
 ↓
Review Task Breakdown
 ↓
Adjust Complexity
 ↓
Calculate Price
 ↓
Review Flags
 ↓
Customer Questions
 ↓
Generate Quotation
 ↓
Export PDF / Copy
```

## 6. Requirement Input

User dapat memasukkan:

- Text.
- Paste chat customer.
- PDF — future.
- DOCX — future.
- XLSX — future.
- TXT — future.

AI harus memisahkan feature yang berbeda.

## 7. AI Task Extraction

AI mengubah requirement mentah menjadi task terstruktur.

Contoh:

```text
1. Google Login
2. Admin Dashboard
3. Excel Export
4. Approval Workflow
```

AI tidak boleh menganggap satu kalimat sebagai satu task jika terdapat beberapa pekerjaan independen.

## 8. AI Task Breakdown

Setiap task dipecah menjadi pekerjaan teknis.

Contoh Google Login:

```text
- OAuth configuration
- Provider integration
- Callback handling
- Account mapping
- Existing account handling
- Error handling
- Testing
```

## 9. Task Classification

Setiap task memiliki:

```text
Type
Complexity
Priority
Risk
Dependency
Confidence
```

### Type

```text
Bug
Enhancement
New Feature
Integration
Infrastructure
Investigation
Maintenance
Change Request
```

### Complexity

```text
Simple
Medium
Complex
Very Complex
```

## 10. Pricing Engine

Default pricing:

| Complexity | Harga |
|---|---:|
| Simple | Rp100.000 |
| Medium | Rp200.000 |
| Complex | Rp300.000 |
| Very Complex | Custom |

Pricing dikontrol oleh application logic, bukan AI.

User dapat mengubah pricing profile.

Contoh:

```text
Simple = Rp150K
Medium = Rp300K
Complex = Rp500K
```

## 11. Complexity Rules

### Simple — Rp100K

Karakteristik:

- Scope jelas.
- Perubahan kecil.
- Dependency rendah.
- Risiko regression rendah.
- Tidak mengubah workflow utama.

Contoh:

- Tambah menu.
- Ubah label.
- Tambah field sederhana.
- Button sederhana.
- Validation sederhana.
- Perubahan UI kecil.

### Medium — Rp200K

Karakteristik:

- Melibatkan frontend dan backend.
- Query database.
- Business logic sederhana.
- Beberapa halaman.
- Testing beberapa scenario.

Contoh:

- CRUD relationship.
- Filter tanggal.
- Search/pagination.
- Dashboard sederhana.
- Export data.
- API endpoint sederhana.

### Complex — Rp300K

Karakteristik:

- Beberapa module.
- Business logic penting.
- Database changes.
- Workflow existing berubah.
- Risiko regression lebih tinggi.

Contoh:

- Approval workflow.
- Multi-step transaction.
- Complex reporting.
- Multiple-role workflow.
- Billing logic.

### Very Complex / Custom

Gunakan jika:

- New module.
- Payment integration.
- External API signifikan.
- Architecture change.
- Large data migration.
- Real-time system.
- Infrastructure change.
- AI/ML processing.
- Banyak dependency.
- Requirement terlalu ambigu.
- Diperkirakan lebih dari satu hari development.

Jangan memaksakan task besar menjadi Rp300K.

## 12. Flag System

Gunakan:

```text
NO_FLAG
CLARIFICATION_REQUIRED
COMPLEX_REVIEW
THIRD_PARTY_DEPENDENCY
DATABASE_REVIEW
ARCHITECTURE_REVIEW
DATA_MIGRATION
CHANGE_REQUEST
```

Task dapat memiliki lebih dari satu flag.

## 13. Clarification Questions

Jika requirement belum jelas, AI menghasilkan pertanyaan.

Contoh:

> Tambahkan payment gateway.

Questions:

```text
1. Provider apa yang digunakan?
2. Apakah akun provider sudah tersedia?
3. Apakah membutuhkan webhook?
4. Apakah pembayaran otomatis mengubah status transaksi?
5. Apakah perlu refund?
6. Apakah perlu reconciliation?
```

User dapat edit, hapus, atau menambah pertanyaan.

## 14. Human Review

AI tidak boleh mengunci hasil.

User dapat mengubah:

- Task name.
- Description.
- Breakdown.
- Type.
- Complexity.
- Price.
- Priority.
- Flag.
- Reason.
- Questions.

## 15. Task Table

| # | Task | Type | Complexity | Price | Flag |
|---:|---|---|---|---:|---|
| 1 | Login Google | Integration | Complex | Rp300K | Third Party |
| 2 | Password Reset | Feature | Medium | Rp200K | - |
| 3 | Dashboard | Feature | Medium | Rp200K | - |
| 4 | Export Excel | Feature | Simple | Rp100K | - |

Summary:

```text
Base Total: Rp800.000

Custom Estimate:
Rp1.000.000 – Rp2.000.000

Indicative Total:
Rp1.800.000 – Rp2.800.000
```

## 16. Estimation Confidence

AI memberikan:

```text
High
Medium
Low
```

Jika Low, tampilkan alasan dan jangan mengklaim harga sebagai final quotation.

## 17. Assumption Management

AI mencatat asumsi seperti:

```text
- Existing authentication system is available.
- Existing database can support the feature.
- External provider API is available.
- No mobile application changes are required.
```

Asumsi digunakan untuk menghindari dispute scope.

## 18. Scope Exclusion

User dapat menentukan pekerjaan yang tidak termasuk:

```text
- Hosting fee
- Domain
- Third-party API fee
- Payment gateway fee
- Data migration
- Post-production support
```

Quotation otomatis menampilkan exclusions.

## 19. Milestone Generator

Untuk project besar, AI menyarankan milestone berdasarkan module/dependency.

Contoh:

```text
Milestone 1 — Authentication
Milestone 2 — Core Transaction
Milestone 3 — Reporting
Milestone 4 — Deployment
```

Setiap milestone memiliki tasks, price, priority, dan estimated effort.

## 20. Quotation Generator

Quotation dapat dibuat dari estimation.

Contoh:

```text
QUOTATION

Project:
CRM Development

Client:
PT ABC

Development Cost:

1. Authentication       Rp300K
2. Dashboard            Rp200K
3. Reporting            Rp300K
4. API Integration      Rp1.500K

Subtotal:
Rp2.300.000

Discount:
Rp300.000

Total:
Rp2.000.000
```

## 21. Quotation Modes

### Detailed

Menampilkan semua task.

### Summary

Menampilkan module, description, dan price.

### Client Friendly

Tidak menampilkan istilah teknis seperti migration, webhook, middleware, atau queue. Gunakan bahasa yang mudah dipahami customer.

## 22. PDF Export

Quotation dapat diekspor ke PDF dengan:

- Logo.
- Nama freelancer.
- Company.
- Address.
- Contact.
- Bank information.
- Signature.
- Terms & Conditions.

## 23. Copy to WhatsApp

Button: **Copy Customer Summary**

Contoh:

```text
Halo Pak/Bu,

Berikut estimasi pengembangan:

1. User Management — Rp500.000
2. Dashboard — Rp750.000
3. Reporting — Rp1.000.000

Total estimasi:
Rp2.250.000

Terima kasih.
```

## 24. Pricing Profiles

User dapat memiliki beberapa profile:

```text
Freelance Standard
Corporate
Maintenance
Custom
```

Setiap profile memiliki pricing rules sendiri.

## 25. AI Configuration

User dapat menentukan:

```text
AI Provider
Model
Temperature
System Prompt
```

Support:

- OpenAI.
- OpenAI-compatible API.
- Ollama.
- Local LLM.

## 26. Custom Skill / Prompt

User dapat memberikan instruksi tambahan, misalnya:

```text
Selalu prioritaskan backend complexity.
Jangan memasukkan deployment ke dalam development task.
Gunakan bahasa Indonesia untuk customer.
```

## 27. Project History

Status project:

```text
Draft
Analyzed
Quoted
Accepted
Rejected
Completed
Archived
```

## 28. Versioning

Satu project dapat memiliki beberapa estimation/quotation version.

Contoh:

```text
Quotation v1 = Rp5.000.000
Quotation v2 = Rp6.500.000
```

Sistem dapat menampilkan perbedaan antar versi.

## 29. Change Request

Jika customer meminta sesuatu di luar scope:

```text
Flag: CHANGE_REQUEST
```

AI membandingkan original scope dengan new request dan memberikan estimasi tambahan.

## 30. Actual vs Estimate — Future

Simpan:

```text
Estimated: 4 hours
Actual: 6 hours
```

Data ini dapat digunakan untuk meningkatkan kualitas estimasi dan pricing profile.

## 31. Dashboard

MVP:

```text
Projects: 12
Draft: 3
Quotation Sent: 4
Accepted: 3
Estimated Revenue: Rp35.000.000
```

Future analytics:

- Average project value.
- Average task value.
- Complexity distribution.
- Estimate accuracy.
- Win rate.

## 32. Data Model

Minimal:

```text
User
 └── PricingProfile
 └── Project
      └── Estimation
           └── Task
                ├── Flag
                ├── Question
                └── Breakdown
```

Suggested tables:

```text
users
pricing_profiles
pricing_rules
projects
estimations
estimation_tasks
task_breakdowns
task_flags
clarification_questions
milestones
quotations
quotation_items
change_requests
project_versions
```

## 33. Suggested Tech Stack

### Frontend

```text
Vue 3
Vite
Tailwind CSS
```

Alternative: Next.js + Tailwind CSS.

### Backend

```text
Laravel
```

### Database

```text
PostgreSQL
```

### AI

```text
OpenAI API
OpenAI-compatible API
Ollama
Local LLM
```

### Storage

```text
S3-compatible storage
```

### Authentication

```text
Laravel Sanctum / OAuth
```

## 34. AI Architecture

AI tidak langsung menentukan harga.

```text
Requirement Parser
       ↓
Task Extractor
       ↓
Task Breaker
       ↓
Complexity Analyzer
       ↓
Risk Analyzer
       ↓
Pricing Engine
       ↓
Quotation Generator
```

AI menentukan complexity. Backend menentukan harga berdasarkan pricing profile.

## 35. Structured AI Output

AI wajib mengembalikan JSON terstruktur.

```json
{
  "tasks": [
    {
      "name": "Google Login",
      "type": "integration",
      "complexity": "complex",
      "reason": "Requires OAuth integration",
      "flags": [
        "THIRD_PARTY_DEPENDENCY",
        "COMPLEX_REVIEW"
      ],
      "breakdown": [
        "OAuth configuration",
        "Callback handling",
        "Account mapping",
        "Error handling",
        "Testing"
      ],
      "questions": [
        "Is OAuth already configured?"
      ],
      "confidence": "medium"
    }
  ]
}
```

## 36. AI Guardrails

AI tidak boleh:

- Mengarang requirement.
- Mengasumsikan provider tanpa informasi.
- Memberikan harga final jika scope tidak jelas.
- Menghapus task.
- Mengubah pricing profile.
- Memasukkan provider fee ke development fee tanpa instruksi.
- Mengklaim estimasi sebagai quotation final jika masih ada uncertainty.

Jika informasi tidak tersedia gunakan:

```text
Unknown
Not specified
Needs clarification
```

## 37. UX Principle

Aplikasi harus terasa seperti:

> **Masukkan chat customer → dapatkan quotation.**

Bukan seperti project management software yang kompleks.

Primary action: **New Estimation**

Secondary:

- History.
- Pricing.
- Settings.

## 38. Main Screens

### Dashboard

Project list, client, value, status, dan tombol New Estimation.

### New Estimation

Input project, client, dan customer requirement.

### AI Analysis

```text
✓ Extracting requirements
✓ Breaking down tasks
✓ Checking complexity
✓ Detecting dependencies
✓ Calculating estimate
```

### Task Review

Menampilkan task, complexity, price, flags, breakdown, dan edit.

### Clarification

Menampilkan pertanyaan yang harus dikirim ke customer.

### Quotation

Menampilkan estimate, custom range, assumptions, exclusions, dan action PDF/Copy.

## 39. MVP Scope

### Must Have

- Authentication.
- Dashboard.
- Create project.
- Paste requirement.
- AI extraction.
- AI breakdown.
- Complexity classification.
- Pricing configuration.
- Automatic pricing.
- Flags.
- Clarification questions.
- Manual editing.
- Total calculation.
- Customer-friendly summary.
- PDF quotation.
- Project history.

### Should Have

- Multiple pricing profiles.
- Milestones.
- Assumptions.
- Scope exclusions.
- Versioning.

### Could Have

- Change Request.
- Actual vs estimate.
- AI provider management.
- Local LLM.
- Analytics.
- WhatsApp integration.

### Won't Have in MVP

- Full CRM.
- Invoice management.
- Payment processing.
- Full project management.
- Time tracking.

## 40. MVP Success Criteria

User harus dapat:

1. Membuat project.
2. Paste task customer.
3. Analyze requirement.
4. Mendapatkan breakdown.
5. Melihat complexity.
6. Melihat pricing.
7. Melihat flags.
8. Melihat clarification questions.
9. Mengedit hasil AI.
10. Generate quotation.
11. Export PDF.
12. Copy summary.

Target:

> **Customer requirement → quotation dalam < 5 menit.**

## 41. Roadmap

### Phase 2

- Change Request.
- Version comparison.
- Milestone.
- Assumption management.
- Scope exclusions.
- Multiple quotation templates.

### Phase 3

- Actual vs estimate.
- Pricing recommendation berdasarkan historical data.
- Client management.
- CRM ringan.
- Proposal generator.

### Phase 4

- AI pricing optimization.
- Learning from completed projects.
- Local LLM.
- Team collaboration.
- Multi-user organization.

## 42. Key Product Differentiator

TaskPricer bukan sekadar AI quotation generator.

Nilai utamanya:

> **AI membantu freelancer mengetahui apakah sebuah request sebenarnya sederhana atau menyembunyikan pekerjaan yang kompleks.**

Produk terdiri dari:

```text
Requirement Analyzer
+
Technical Estimator
+
Pricing Engine
+
Scope Protection
+
Quotation Generator
```

## 43. Golden Product Rule

> **AI boleh menganalisis scope, tetapi pricing engine tetap dikontrol oleh user.**

> **Jika AI tidak yakin terhadap scope, aplikasi harus menampilkan uncertainty dan meminta klarifikasi, bukan mengarang harga.**

Core value:

> **Jangan lagi menentukan harga freelance hanya berdasarkan feeling.**
