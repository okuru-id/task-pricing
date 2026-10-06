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

  return (
    <aside className="bg-sidebar flex w-60 shrink-0 flex-col gap-2 border-r p-5">
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
  );
}
