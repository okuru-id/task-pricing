import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertOctagon,
  Clock,
  Layers,
  HelpCircle,
  FileCheck2,
  Zap,
  Sliders,
  Users2,
  Briefcase,
} from "lucide-react";

import { auth } from "@/auth";
import { InteractivePreview } from "@/components/landing/interactive-preview";
import { FaqSection } from "@/components/landing/faq-section";
import { TaskPricerLogo } from "@/components/logo";

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-indigo-500 selection:text-white dark:bg-zinc-950 dark:text-zinc-100">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <TaskPricerLogo
              size={36}
              variant="tag"
              className="size-9 rounded-xl shadow-md shadow-indigo-600/20 transition-transform group-hover:scale-105"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                TaskPricer
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                PRO
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#fitur" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              Fitur
            </a>
            <a href="#simulasi" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              Simulasi
            </a>
            <a href="#cara-kerja" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              Cara Kerja
            </a>
            <a href="#keunggulan" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              Keunggulan
            </a>
            <a href="#faq" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Dashboard
                </Link>
                <Link
                  href="/estimations/new"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  <Sparkles className="size-3.5" />
                  <span>Buat Estimasi</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                >
                  Masuk
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500"
                >
                  <span>Mulai Gratis</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-500 to-emerald-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs dark:border-indigo-900/50 dark:bg-indigo-950/50 dark:text-indigo-300 mb-6">
            <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>AI-Assisted Freelance Task Estimator &amp; Quotation Engine</span>
            <span className="hidden sm:inline-block text-indigo-300 dark:text-indigo-700">•</span>
            <span className="hidden sm:inline-block font-normal text-indigo-900 dark:text-indigo-200">
              100% BYOK
            </span>
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl dark:text-white leading-[1.15]">
            Ubah Chat Customer Menjadi{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 bg-clip-text text-transparent">
              Quotation Profesional
            </span>{" "}
            dalam 3 Menit
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Cukup paste pesan requirement dari WhatsApp atau email. TaskPricer otomatis membedah
            sub-task teknis, mendeteksi kerumitan tersembunyi, dan menghitung penawaran objektif tanpa
            resiko underpricing maupun scope creep.
          </p>

          {/* CTA Group */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href={isLoggedIn ? "/estimations/new" : "/login"}
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98]"
            >
              <Zap className="size-4" />
              <span>{isLoggedIn ? "Buat Estimasi Proyek Baru" : "Coba Buat Estimasi Sekarang"}</span>
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#simulasi"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850"
            >
              <FileText className="size-4 text-zinc-500" />
              <span>Lihat Demo Interaktif</span>
            </a>
          </div>

          {/* Mini Trust Points */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Pricing Engine Deterministik (Anti Halusinasi)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Export PDF Resmi &amp; Format WhatsApp 1-Klik</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Aman: Kunci API Milik Anda Sendiri (BYOK)</span>
            </div>
          </div>
        </div>

        {/* 3. Interactive Preview Showcase */}
        <div id="simulasi" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white sm:text-2xl">
              Lihat Bagaimana TaskPricer Bekerja
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Eksplorasi simulasi konversi requirement chat acak menjadi rincian terstruktur.
            </p>
          </div>
          <InteractivePreview />
        </div>
      </section>

      {/* 4. Pain Points Section: Kenapa Freelancer Sering Tekor */}
      <section className="border-t border-zinc-200/80 bg-white py-20 dark:border-zinc-850 dark:bg-zinc-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-semibold tracking-wider uppercase text-rose-600 dark:text-rose-400">
              Masalah Nyata Freelancer
            </span>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-white">
              Mengapa Estimasi Manual &amp; &ldquo;Feeling&rdquo; Sering Bikin Proyek Boncos?
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
              Menentukan harga di chat WhatsApp tanpa breakdown terperinci adalah penyebab utama freelancer kerja lembur tanpa bayaran tambahan.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex size-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mb-4">
                <AlertOctagon className="size-5" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Underpricing karena Feeling
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Fitur kelihatan simpel di depan mata, tapi di baliknya ada setup database, validasi, dan integrasi rumit yang tidak terhitung di harga awal.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mb-4">
                <Layers className="size-5" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Scope Creep Tanpa Batas
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Klien terus minta revisi di luar kesepakatan karena penawaran awal tidak menyertakan daftar Asumsi &amp; Batasan yang jelas secara hitam-di-atas-putih.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 mb-4">
                <Clock className="size-5" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Bikin Dokumen Berjam-jam
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Menyusun proposal di Word atau spreadsheet makan waktu berjam-jam. Saat proposal selesai, klien sudah memilih developer lain yang lebih cepat merespons.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-4">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Solusi Pasti: TaskPricer
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Otomatisasi breakdown task, flag risiko dependensi pihak ketiga, tentukan harga sesuai profil Anda, dan unduh quotation PDF dalam 3 menit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Features Section */}
      <section id="fitur" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              Fitur Lengkap
            </span>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-white">
              Dirancang Khusus untuk Developer &amp; Konsultan IT
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
              Setiap elemen didesain untuk mempercepat respon penawaran Anda dengan akurasi pengerjaan yang terjamin.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
              <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-5 group-hover:scale-105 transition">
                <Sparkles className="size-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Ekstraksi Task AI Otomatis
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Cukup paste pesan chat informal. AI mengenali entitas fitur, memisahkan modul, dan mengurai langkah-langkah implementasi teknisnya secara presisi.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-5 group-hover:scale-105 transition">
                <Calculator className="size-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Pricing Engine Deterministik
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                AI tidak pernah mengarang harga sembarangan. Total biaya dihitung murni oleh aturan harga Anda: Simple (Rp100k), Medium (Rp200k), Complex (Rp300k), atau Custom Range.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mb-5 group-hover:scale-105 transition">
                <AlertOctagon className="size-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Flagging Risiko &amp; Dependensi
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Deteksi otomatis task beresiko seperti THIRD_PARTY_DEPENDENCY, COMPLEX_REVIEW, DATA_MIGRATION, dan ARCHITECTURE_REVIEW agar tidak lolos tanpa proteksi.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mb-5 group-hover:scale-105 transition">
                <HelpCircle className="size-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Pertanyaan Klarifikasi Klien
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                AI merangkum daftar pertanyaan penting yang wajib Anda tanyakan ke klien untuk menutup celah ambiguitas requirement sebelum deal.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
              <div className="flex size-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 mb-5 group-hover:scale-105 transition">
                <FileCheck2 className="size-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Quotation PDF &amp; Format WhatsApp
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Ekspor dokumen PDF resmi lengkap dengan logo brand, nomor rekening, rincian biaya, dan syarat ketentuan; atau salin ringkasan WhatsApp yang sopan dalam 1 klik.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700">
              <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mb-5 group-hover:scale-105 transition">
                <Sliders className="size-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Profil Tarif &amp; Model BYOK
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Atur multi-profil harga (Standard, Korporat, Maintenance). Didukung model Bring Your Own Key: gunakan API key OpenAI / Ollama lokal sendiri tanpa markup token.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Cara Kerja (Workflow 3 Langkah) */}
      <section id="cara-kerja" className="border-t border-zinc-200/80 bg-zinc-100/50 py-20 dark:border-zinc-850 dark:bg-zinc-900/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              Alur Singkat
            </span>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-white">
              Hanya Butuh 3 Langkah Menuju Penawaran Resmi
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
              Dari pesan chat yang berantakan hingga surat penawaran siap tanda tangan.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                1
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Paste Pesan Klien
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Masukkan nama proyek, nama klien, dan salin langsung teks obrolan WhatsApp, email requirement, atau catatan rapat ke kolom estimasi.
              </p>
            </div>

            <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                2
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Review &amp; Sesuaikan
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                AI mengurai tugas dan menghitung harga otomatis. Anda memegang kendali penuh untuk mengedit nama task, mengubah tingkat kerumitan, atau menambahkan catatan khusus.
              </p>
            </div>

            <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                3
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Kirim Quotation Resmi
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Download dokumen PDF ber-branding profesional dalam hitungan detik atau klik &ldquo;Copy WhatsApp&rdquo; untuk langsung membalas chat klien dengan elegan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Target Persona / Keunggulan */}
      <section id="keunggulan" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              Siapa yang Menggunakan TaskPricer?
            </span>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-white">
              Dibuat untuk Para Profesional IT
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-4">
                <Users2 className="size-5" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white">Freelancer Developer</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Kirim penawaran cepat di bawah 5 menit dengan harga yang konsisten dan quotation resmi berbahasa Indonesia agar terlihat profesional di hadapan klien.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-4">
                <Briefcase className="size-5" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white">Konsultan IT Independen</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Lakukan technical breakdown terperinci, analisis risiko dependensi pihak ketiga, dan susun proposal berbasis milestone terstruktur.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 mb-4">
                <Layers className="size-5" />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white">Software House Kecil</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Standarisasi cara estimasi untuk tim Anda (2–10 developer). Hindari perbedaan harga antar anggota tim dan kelola status pipeline penawaran proyek.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section id="faq" className="border-t border-zinc-200/80 bg-zinc-50/50 py-20 dark:border-zinc-850 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
              Tanya Jawab
            </span>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-white">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Punya pertanyaan mengenai TaskPricer? Temukan jawabannya di bawah ini.
            </p>
          </div>
          <FaqSection />
        </div>
      </section>

      {/* 9. Final CTA Banner */}
      <section className="relative overflow-hidden py-20 bg-indigo-600 text-white dark:bg-indigo-700">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hentikan Kebiasaan Tekor Akibat Estimasi Feeling
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-indigo-100 sm:text-base">
            Mulai kirim penawaran proyek yang objektif, terlindungi dari scope creep, dan berformat resmi hari ini.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isLoggedIn ? "/estimations/new" : "/login"}
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-bold text-indigo-600 shadow-lg shadow-black/10 transition hover:bg-zinc-100 active:scale-[0.98]"
            >
              <span>{isLoggedIn ? "Masuk ke Ruang Estimasi" : "Mulai Gunakan TaskPricer Sekarang"}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="border-t border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <TaskPricerLogo size={28} variant="tag" className="size-7 rounded-lg shadow-xs" />
              <span className="font-bold text-zinc-900 dark:text-white">TaskPricer</span>
              <span className="text-xs text-zinc-400">
                — Freelance Task Estimator &amp; Quotation
              </span>
            </div>

            <div className="flex gap-6 text-xs text-zinc-500">
              <a href="#fitur" className="hover:text-zinc-900 dark:hover:text-white">
                Fitur
              </a>
              <a href="#simulasi" className="hover:text-zinc-900 dark:hover:text-white">
                Simulasi
              </a>
              <a href="#cara-kerja" className="hover:text-zinc-900 dark:hover:text-white">
                Cara Kerja
              </a>
              <a href="#faq" className="hover:text-zinc-900 dark:hover:text-white">
                FAQ
              </a>
              <Link href="/login" className="hover:text-zinc-900 dark:hover:text-white">
                Login
              </Link>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-100 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-900">
            &copy; {new Date().getFullYear()} TaskPricer. Dibuat untuk freelancer &amp; developer Indonesia.
          </div>
        </div>
      </footer>
    </div>
  );
}
