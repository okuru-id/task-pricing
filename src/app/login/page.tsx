import { redirect } from "next/navigation";
import { Calculator, CircleCheck, ShieldCheck } from "lucide-react";

import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

import { LoginForm } from "./login-form";

const BENEFITS = [
  "Harga dihitung aplikasi, bukan AI",
  "Semua hasil AI bisa Anda edit",
  "Export PDF dan ringkasan WhatsApp",
];

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <div className="flex min-h-svh">
      <aside className="bg-primary hidden w-[640px] shrink-0 flex-col justify-center gap-6 p-16 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary-foreground flex size-9 items-center justify-center rounded-[9px]">
            <Calculator className="text-primary size-5" />
          </div>
          <span className="text-primary-foreground text-xl font-bold">TaskPricer</span>
        </div>

        <div className="flex max-w-[512px] flex-col gap-4">
          <h1 className="text-primary-foreground text-[40px] leading-tight font-bold">
            Masukkan chat customer, dapatkan quotation.
          </h1>
          <p className="text-primary-fg-muted text-base">
            Estimasi task, harga konsisten, dan quotation profesional dalam kurang dari 5
            menit.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="text-primary-foreground flex items-center gap-2.5 text-[13px]">
              <CircleCheck className="size-4 shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[400px] space-y-5">
          <LoginForm />

          {googleEnabled && (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <Button type="submit" variant="outline" className="h-10 w-full">
                Masuk dengan Google
              </Button>
            </form>
          )}

          <div className="bg-primary-soft flex items-start gap-2.5 rounded-lg p-3">
            <ShieldCheck className="text-primary mt-px size-4 shrink-0" />
            <p className="text-primary text-xs">
              Data requirement Anda terenkripsi dan dikirim hanya ke AI provider yang Anda
              pilih.
            </p>
          </div>

          <p className="text-muted-foreground text-xs">
            Dengan masuk, Anda menyetujui Syarat Layanan dan Kebijakan Privasi (UU PDP).
          </p>
        </div>
      </main>
    </div>
  );
}
