"use client";

import { useActionState, useState } from "react";
import { FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { login, register, type AuthState } from "./actions";

export interface DevCredentials {
  email: string;
  password: string;
}

export function LoginForm({ devCredentials }: { devCredentials?: DevCredentials }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const action = mode === "login" ? login : register;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  const isLogin = mode === "login";

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-[26px] leading-tight font-bold">
          {isLogin ? "Masuk ke TaskPricer" : "Buat akun TaskPricer"}
        </h2>
        <p className="text-muted-foreground text-[13px]">
          {isLogin
            ? "Masukkan email dan password akun Anda."
            : "Gratis untuk memulai. Satu workspace pribadi dibuat otomatis."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[13px]">
          Email
        </Label>
        <Input
          key={`email-${mode}`}
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="budi@email.com"
          defaultValue={isLogin ? devCredentials?.email : undefined}
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[13px]">
          Password
        </Label>
        <Input
          key={`password-${mode}`}
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder="Minimal 8 karakter"
          defaultValue={isLogin ? devCredentials?.password : undefined}
          className="h-10"
        />
      </div>

      {state?.error && (
        <p className="bg-danger-subtle text-danger border-danger-border rounded-lg border px-3 py-2 text-[13px]">
          {state.error}
        </p>
      )}

      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Memproses…" : isLogin ? "Masuk" : "Buat akun"}
      </Button>

      {devCredentials && (
        <div className="bg-warning-soft flex items-start gap-2.5 rounded-lg p-3">
          <FlaskConical className="text-warning mt-px size-4 shrink-0" />
          <div className="text-warning-strong space-y-1 text-xs">
            <p className="font-semibold">Akun development</p>
            <p className="font-mono break-all">{devCredentials.email}</p>
            <p className="font-mono break-all">{devCredentials.password}</p>
            <p>Sudah terisi otomatis — tinggal klik Masuk.</p>
          </div>
        </div>
      )}

      <p className="text-muted-foreground text-center text-[13px]">
        {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
        <button
          type="button"
          onClick={() => setMode(isLogin ? "register" : "login")}
          className="text-primary font-semibold hover:underline"
        >
          {isLogin ? "Daftar" : "Masuk"}
        </button>
      </p>
    </form>
  );
}
