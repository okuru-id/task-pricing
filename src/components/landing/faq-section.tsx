"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "Apakah AI yang menentukan harga akhir proyek saya?",
    answer:
      "Sama sekali tidak. AI hanya bertugas mengekstrak requirement menjadi task terstruktur, merinci sub-langkah teknis, dan mengklasifikasikan level kompleksitasnya. Harga dihitung secara deterministik dan kaku oleh Pricing Engine berdasarkan profil tarif yang Anda tentukan sendiri. Anda memiliki kendali 100% untuk meninjau dan mengubah setiap angka sebelum dikirim ke klien.",
  },
  {
    question: "Apa itu konsep BYOK (Bring Your Own Key) & bagaimana keamanannya?",
    answer:
      "BYOK berarti Anda membawa API Key AI Anda sendiri (OpenAI GPT, endpoint kompatibel OpenAI, atau Ollama lokal). API Key Anda disimpan terenkripsi standar militer AES-256-GCM, tidak pernah diekspos ke publik atau browser, dan tidak ada kuota token maupun markup biaya tambahan dari kami.",
  },
  {
    question: "Bagaimana cara TaskPricer melindungi freelancer dari scope creep?",
    answer:
      "Setiap quotation otomatis menyertakan pasal Asumsi Teknis (misal: akun server & kredensial disiapkan klien) dan Scope Exclusions (batasan yang tidak masuk pengerjaan, seperti biaya pihak ketiga, domain, data migrasi masif). Dengan batasan hitam-di-atas-putih, klien tidak bisa meminta pekerjaan tambahan tanpa Change Request resmi.",
  },
  {
    question: "Apakah klien saya akan bingung dengan istilah teknis rumit di quotation?",
    answer:
      "Tidak. TaskPricer menyediakan mode ringkasan 'Client-Friendly' yang mengubah istilah teknis mendalam (seperti OAuth, Webhook, Redis Queue, Cron Job) menjadi uraian fungsional yang ramah bagi pemilik bisnis dan manajer non-teknis, lengkap dengan teks siap salin ke WhatsApp.",
  },
  {
    question: "Bisakah saya mengatur tarif berbeda untuk klien UMKM vs Klien Korporat?",
    answer:
      "Bisa. TaskPricer mendukung multi Pricing Profile. Anda dapat membuat profil khusus untuk Proyek UMKM, Klien Korporat, atau Maintenance Retainer. Saat quotation dibuat, sistem menyimpan snapshot harga immutable sehingga perubahan profil di masa depan tidak merusak riwayat penawaran lama.",
  },
  {
    question: "Apakah saya bisa langsung mengekspor quotation ke PDF resmi?",
    answer:
      "Ya. TaskPricer memiliki generator PDF bawaan berkecepatan tinggi (< 5 detik) yang memuat logo brand Anda, data klien, rincian biaya per task/modul, subtotal, diskon, catatan rekening bank, dan kolom tanda tangan resmi.",
  },
];

export function FaqSection() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <Accordion className="space-y-4">
        {faqs.map((faq, idx) => (
          <AccordionItem
            key={idx}
            value={`item-${idx}`}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-2 shadow-xs transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <AccordionTrigger className="text-base font-semibold text-zinc-900 dark:text-zinc-100 hover:no-underline hover:text-indigo-600 dark:hover:text-indigo-400 py-3">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 pt-1 pb-4">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
