"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Play,
  Loader2,
  Cpu,
  Layers,
  ShieldAlert,
} from "lucide-react";

interface SampleCase {
  id: string;
  title: string;
  chatText: string;
  trapWarning: string;
  tasks: Array<{
    title: string;
    complexity: "Simple" | "Medium" | "Complex" | "Very Complex";
    complexityClass: string;
    price: string;
    flags: string[];
  }>;
  totalRange: string;
  clarifications: Array<{
    title: string;
    desc: string;
  }>;
  waSummary: string;
}

const sampleCases: SampleCase[] = [
  {
    id: "course",
    title: "Platform Kursus Online",
    chatText: `Halo mas Budi, butuh buat web kursus online mini nih.
Fiturnya:
- Login Google akun & profil peserta
- List katalog materi & video player
- Payment gateway Midtrans (QRIS & Virtual Account)
- Generate sertifikat PDF otomatis setelah tuntas
- Sistem kode voucher diskon saat checkout
Kira-kira budget 1,5 juta bisa kelar 3 hari ya mas?`,
    trapWarning:
      "Deteksi Jebakan: Klien menawarkan 1,5jt untuk 5 modul termasuk Midtrans & sertifikat PDF. AI mendeteksi estimasi pasar yang realistis adalah Rp2.100.000 – Rp2.700.000.",
    tasks: [
      {
        title: "1. Google OAuth & Manajemen Profil",
        complexity: "Complex",
        complexityClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        price: "Rp300.000",
        flags: ["THIRD_PARTY_DEPENDENCY"],
      },
      {
        title: "2. Payment Gateway Midtrans (QRIS & VA)",
        complexity: "Very Complex",
        complexityClass: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
        price: "Rp1.200.000 – Rp1.800.000",
        flags: ["COMPLEX_REVIEW", "THIRD_PARTY_DEPENDENCY"],
      },
      {
        title: "3. Generator Sertifikat PDF Dinamis",
        complexity: "Medium",
        complexityClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        price: "Rp200.000",
        flags: [],
      },
      {
        title: "4. Sistem Kode Voucher Diskon Checkout",
        complexity: "Medium",
        complexityClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        price: "Rp200.000",
        flags: [],
      },
      {
        title: "5. Modul Katalog Kursus & Video Player",
        complexity: "Medium",
        complexityClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        price: "Rp200.000",
        flags: [],
      },
    ],
    totalRange: "Rp2.100.000 – Rp2.700.000",
    clarifications: [
      {
        title: "1. Hosting Video:",
        desc: "Apakah video kursus akan di-embed dari YouTube Unlisted / Vimeo, atau perlu storage AWS S3 & streaming player khusus?",
      },
      {
        title: "2. Akun Midtrans:",
        desc: "Apakah legalitas bisnis sudah terverifikasi di Midtrans Production, atau masih butuh pendampingan registrasi & sandbox test?",
      },
      {
        title: "3. Template Sertifikat:",
        desc: "Apakah aset grafis template sertifikat sudah tersedia dalam format siap pakai?",
      },
    ],
    waSummary: `Halo Kak, terima kasih atas requirement proyek Platform Kursus Online Mini.

Berikut ringkasan estimasi pengerjaan profesional berdasarkan scope yang dibahas:
• Fitur Utama: Google Login, Katalog & Video Player, Payment Gateway Midtrans, Sertifikat PDF, Sistem Voucher Diskon.
• Estimasi Waktu Pengerjaan: 10 - 14 hari kerja.
• Total Estimasi Investasi: Rp2.100.000 - Rp2.700.000

Catatan & Batasan:
1. Akun Midtrans Production & Google Cloud disiapkan oleh pihak klien.
2. Belum termasuk biaya hosting, domain, dan biaya MDR transaksi per payment channel.

Dokumen detail Quotation & Breakdown Teknis terlampir dalam format PDF resmi. Mohon konfirmasinya ya Kak jika ada pertanyaan lebih lanjut. Terima kasih!`,
  },
  {
    id: "pos",
    title: "Aplikasi POS & Kasir Barcode",
    chatText: `Malam gan, mau bikin web app kasir toko buat 3 cabang.
Ada scan barcode kamera HP, cetak struk printer Bluetooth thermal, laporan laba rugi bulanan, sama hak akses kasir vs owner. Bisa beres minggu ini kan?`,
    trapWarning:
      "Deteksi Jebakan: Pengerjaan multi-cabang & integrasi Web Bluetooth Thermal Printer memiliki risiko kompabilitas perangkat keras. Estimasi realistis Rp2.600.000 – Rp3.400.000.",
    tasks: [
      {
        title: "1. Multi-tenant Cabang & Role Access Control",
        complexity: "Complex",
        complexityClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        price: "Rp300.000",
        flags: ["ARCHITECTURE_REVIEW"],
      },
      {
        title: "2. Integrasi Web Bluetooth Thermal Printer",
        complexity: "Very Complex",
        complexityClass: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
        price: "Rp1.500.000 – Rp2.000.000",
        flags: ["COMPLEX_REVIEW", "THIRD_PARTY_DEPENDENCY"],
      },
      {
        title: "3. Scanner Barcode via WebRTC Camera",
        complexity: "Medium",
        complexityClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        price: "Rp200.000",
        flags: [],
      },
      {
        title: "4. Laporan Penjualan & Laba Rugi",
        complexity: "Complex",
        complexityClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        price: "Rp300.000",
        flags: ["DATABASE_REVIEW"],
      },
      {
        title: "5. Modul Transaksi Kasir & Keranjang Cepat",
        complexity: "Medium",
        complexityClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        price: "Rp200.000",
        flags: [],
      },
    ],
    totalRange: "Rp2.600.000 – Rp3.400.000",
    clarifications: [
      {
        title: "1. Model Printer Thermal:",
        desc: "Apa merek dan protokol printer Bluetooth yang digunakan kasir (ESC/POS 58mm atau 80mm)?",
      },
      {
        title: "2. Sinkronisasi Offline:",
        desc: "Apakah aplikasi harus tetap bisa transaksi saat internet di toko terputus (offline mode)?",
      },
    ],
    waSummary: `Halo Kak, terima kasih atas requirement proyek Web POS Kasir Multi-Cabang.

Berikut ringkasan estimasi pengerjaan profesional berdasarkan scope yang dibahas:
• Fitur Utama: Role Hak Akses 3 Cabang, Scanner Barcode, Integrasi Thermal Printer Bluetooth, Transaksi Kasir, Laporan Laba Rugi.
• Estimasi Waktu Pengerjaan: 12 - 16 hari kerja.
• Total Estimasi Investasi: Rp2.600.000 - Rp3.400.000

Catatan & Batasan:
1. Perangkat hardware printer bluetooth dan smartphone scanner disediakan pihak klien.
2. Tidak mencakup biaya langganan cloud database & domain server.

Detail penawaran resmi telah kami lampirkan. Ditunggu kabar baiknya ya Kak!`,
  },
];

const PROCESSING_STEPS = [
  { label: "Mengekstrak entitas & fitur dari chat...", icon: Cpu },
  { label: "Memecah sub-task teknis & dependensi...", icon: Layers },
  { label: "Mendeteksi risiko & flag kompleksitas...", icon: ShieldAlert },
  { label: "Menghitung biaya di Pricing Engine...", icon: Sparkles },
  { label: "Menghasilkan ringkasan penawaran & quotation...", icon: CheckCircle2 },
];

export function InteractivePreview() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("course");
  const [activeTab, setActiveTab] = useState<"breakdown" | "whatsapp" | "clarification">("breakdown");
  const [copied, setCopied] = useState(false);

  // State untuk animasi pemrosesan
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [detectedChips, setDetectedChips] = useState<string[]>([]);

  const activeCase = sampleCases.find((c) => c.id === selectedCaseId) ?? sampleCases[0];

  const runSimulation = () => {
    setIsProcessing(true);
    setCurrentStepIndex(0);
    setProgressPercent(10);
    setDetectedChips([]);

    // Step 1: Ekstraksi fitur (0.5 detik)
    setTimeout(() => {
      setCurrentStepIndex(1);
      setProgressPercent(35);
      setDetectedChips(["Fitur Terdeteksi: 5 Modul"]);
    }, 700);

    // Step 2: Breakdown sub-task (1.4 detik)
    setTimeout(() => {
      setCurrentStepIndex(2);
      setProgressPercent(60);
      setDetectedChips(["Fitur: 5 Modul", "Sub-task: 14 Item"]);
    }, 1400);

    // Step 3: Flag risiko & complexity (2.1 detik)
    setTimeout(() => {
      setCurrentStepIndex(3);
      setProgressPercent(82);
      setDetectedChips(["Fitur: 5 Modul", "Sub-task: 14 Item", "Flag: Third-Party & Complex"]);
    }, 2100);

    // Step 4: Menghitung harga deterministik (2.8 detik)
    setTimeout(() => {
      setCurrentStepIndex(4);
      setProgressPercent(96);
      setDetectedChips([
        "Fitur: 5 Modul",
        "Sub-task: 14 Item",
        "Flag: Third-Party & Complex",
        "Pricing: Deterministik",
      ]);
    }, 2800);

    // Selesai (3.4 detik)
    setTimeout(() => {
      setIsProcessing(false);
      setProgressPercent(100);
      setCurrentStepIndex(4);
    }, 3400);
  };

  useEffect(() => {
    // Jalankan simulasi otomatis sekali saat pertama kali dibuka untuk menarik perhatian pengunjung
    const timer = setTimeout(() => {
      runSimulation();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleCaseChange = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveTab("breakdown");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCase.waSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 sm:p-6 lg:p-8">
      {/* Top Banner simulation & Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-850">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            Simulasi Nyata: Dari Chat Klien Menjadi Quotation
          </span>

          {/* Selector Sample Kasus */}
          <div className="flex items-center gap-1 ml-1 sm:ml-4">
            {sampleCases.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCaseChange(c.id)}
                disabled={isProcessing}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedCaseId === c.id
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        {/* Tombol Jalankan / Ulangi Simulasi */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runSimulation}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95 disabled:pointer-events-none disabled:opacity-70"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Menganalisis ({progressPercent}%)...</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 fill-current" />
                <span>Simulasikan Analisis AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column: Input raw chat */}
        <div className="flex flex-col lg:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              1. Input Chat Mentah (WhatsApp / Email)
            </span>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Raw Input
            </span>
          </div>

          <div
            className={`relative flex-1 overflow-hidden rounded-xl border p-4 font-sans text-sm transition-all duration-300 ${
              isProcessing
                ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                : "border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10"
            }`}
          >
            {/* Laser scanning bar during processing */}
            {isProcessing && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-bounce" />
            )}

            <div className="mb-3 flex items-center justify-between border-b border-emerald-200/40 pb-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-3.5 text-emerald-600" />
                <span>Pesan Chat dari Klien</span>
              </div>
              {isProcessing && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="size-3 animate-spin" />
                  Membaca requirement...
                </span>
              )}
            </div>

            <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {activeCase.chatText}
            </p>

            <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Deteksi Celah:</strong> {activeCase.trapWarning}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle indicator / Processing Bridge */}
        <div className="hidden lg:col-span-1 lg:flex flex-col items-center justify-center">
          <div
            className={`flex size-10 items-center justify-center rounded-full transition-all duration-300 ${
              isProcessing
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-110"
                : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
            }`}
          >
            {isProcessing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
          </div>
        </div>

        {/* Right column: Processing state OR Results */}
        <div className="flex flex-col lg:col-span-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              2. Hasil Analisis &amp; Dokumen Penawaran
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("breakdown")}
                disabled={isProcessing}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  activeTab === "breakdown"
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                } disabled:opacity-50`}
              >
                Breakdown Task
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("clarification")}
                disabled={isProcessing}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  activeTab === "clarification"
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                } disabled:opacity-50`}
              >
                Klarifikasi ({activeCase.clarifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("whatsapp")}
                disabled={isProcessing}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  activeTab === "whatsapp"
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                } disabled:opacity-50`}
              >
                Copy WA
              </button>
            </div>
          </div>

          <div className="relative min-h-[340px] rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            {/* Tampilan saat SEDANG MEMPROSES (ANIMASI REAL-TIME) */}
            {isProcessing ? (
              <div className="flex h-full min-h-[300px] flex-col justify-between py-2">
                <div>
                  {/* Progress Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                        <Cpu className="size-4 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-white">
                          Pipeline AI Sedang Berjalan
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Structured Output • Zod Validated
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {progressPercent}%
                    </span>
                  </div>

                  {/* Progress Bar with glow */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Step List Realtime */}
                  <div className="mt-6 space-y-2.5">
                    {PROCESSING_STEPS.map((step, idx) => {
                      const Icon = step.icon;
                      const isDone = idx < currentStepIndex;
                      const isCurrent = idx === currentStepIndex;

                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs transition-all duration-200 ${
                            isCurrent
                              ? "border-indigo-500/40 bg-indigo-50/60 font-semibold text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"
                              : isDone
                              ? "border-emerald-500/30 bg-emerald-50/40 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
                              : "border-transparent text-zinc-400 dark:text-zinc-600"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="size-4 text-indigo-600 animate-spin shrink-0" />
                          ) : (
                            <Icon className="size-4 text-zinc-400 shrink-0" />
                          )}
                          <span className="flex-1">{step.label}</span>
                          {isCurrent && (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 animate-pulse">
                              Active
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live chips detected */}
                {detectedChips.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    {detectedChips.map((chip, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-zinc-700 shadow-xs border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 animate-fadeIn"
                      >
                        ✓ {chip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Tampilan HASIL ANALISIS (SETELAH SELESAI ATAU DEFAULT) */
              <div>
                {activeTab === "breakdown" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5 dark:border-zinc-800">
                      <div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {activeCase.tasks.length} Task Teridentifikasi
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Estimasi Terkendali • Bebas Halusinasi
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-zinc-500">Total Rekomendasi:</span>
                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {activeCase.totalRange}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {activeCase.tasks.map((task, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between rounded-lg border border-zinc-200/80 bg-white p-2.5 text-xs transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                        >
                          <div>
                            <div className="font-medium text-zinc-800 dark:text-zinc-200">
                              {task.title}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${task.complexityClass}`}
                              >
                                {task.complexity}
                              </span>
                              {task.flags.map((flag, fIdx) => (
                                <span
                                  key={fIdx}
                                  className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300 shrink-0 ml-2">
                            {task.price}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg bg-emerald-500/10 p-2 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        Asumsi &amp; Batasan otomatis disertakan di Quotation PDF
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Siap Di-export
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === "clarification" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      <HelpCircle className="size-4 text-indigo-600" />
                      <span>Pertanyaan Cerdas yang Perlu Ditanyakan ke Klien</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-normal">
                      Cegah salah paham dan revisi berulang sebelum proyek dimulai. AI merumuskan
                      pertanyaan penting dari celah requirement klien:
                    </p>

                    <div className="space-y-2 text-xs">
                      {activeCase.clarifications.map((q, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900"
                        >
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {q.title}
                          </span>
                          <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{q.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "whatsapp" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Format Pesan WhatsApp Ramah Klien
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                      >
                        {copied ? (
                          <>
                            <Check className="size-3 text-emerald-600" />
                            Tersalin!
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            Salin Pesan
                          </>
                        )}
                      </button>
                    </div>
                    <div className="rounded-lg bg-emerald-950/5 border border-emerald-500/20 p-3 font-mono text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300 max-h-[220px] overflow-y-auto whitespace-pre-wrap">
                      {activeCase.waSummary}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
