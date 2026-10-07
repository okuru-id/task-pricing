"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, History, LayoutDashboard, Plus, Settings, Tag } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: History },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  name,
  email,
  initials,
  signOutSlot,
}: {
  name: string;
  email: string;
  initials: string;
  signOutSlot: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/*
        Mobile: sidebar 240px tidak muat di layar 375px. Mengikuti design "Dashboard - Mobile":
        navigasi pindah ke tab bar bawah, dan tombol New Estimation jadi tombol melayang
        agar aksi utama tetap sejangkauan ibu jari.
      */}
      <Link
        href="/estimations/new"
        title="New Estimation"
        className="bg-primary text-primary-foreground fixed right-4 bottom-[86px] z-40 flex size-12 items-center justify-center rounded-full shadow-lg lg:hidden"
      >
        <Plus className="size-5" />
      </Link>

      <nav className="bg-sidebar fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-[10px] py-1.5 text-[11px]",
              isActive(href)
                ? "bg-primary-soft text-primary font-medium"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        ))}
      </nav>

      <aside className="bg-sidebar hidden w-60 shrink-0 flex-col gap-2 border-r p-5 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 pb-4">
        <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
          <Calculator className="text-primary-foreground size-[18px]" />
        </div>
        <span className="text-lg font-bold">TaskPricer</span>
      </Link>

      <Link
        href="/estimations/new"
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium"
      >
        <Plus className="size-4" />
        New Estimation
      </Link>

      <nav className="mt-2 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-[38px] items-center gap-2.5 rounded-lg px-3 text-sm",
                active
                  ? "bg-primary-soft text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="bg-background flex items-center gap-2.5 rounded-[10px] p-2.5">
          <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{name}</p>
            <p className="text-muted-foreground truncate text-xs">{email}</p>
          </div>
          {signOutSlot}
        </div>
      </div>
      </aside>
    </>
  );
}
