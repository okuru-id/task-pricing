"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  history: "Riwayat",
  pricing: "Profil Harga",
  settings: "Pengaturan AI",
  estimations: "Estimasi",
  new: "Estimasi Baru",
  projects: "Proyek",
  quotation: "Quotation",
  clarification: "Klarifikasi",
  milestone: "Milestone",
  requirement: "Requirement",
  analyze: "Analisis AI",
};

export function AppHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-sidebar/95 px-4 backdrop-blur-xs transition-[width,height] ease-linear lg:px-6">
      <div className="flex w-full items-center gap-2">
        {/* 1. Sidebar Trigger */}
        <SidebarTrigger className="-ml-1" />

        <Separator orientation="vertical" className="mr-2 my-auto h-4" />

        {/* 2. Breadcrumbs ala shadcn */}
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard" />}>
                TaskPricer
              </BreadcrumbLink>
            </BreadcrumbItem>

            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1;
              const label =
                ROUTE_LABELS[segment] ??
                (segment.length > 14 ? `${segment.slice(0, 12)}...` : segment);
              const href = `/${segments.slice(0, index + 1).join("/")}`;

              return (
                <span key={href} className="inline-flex items-center gap-1.5">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={href} />}>
                        {label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        {/* 3. Right Action Area: New Estimation & Theme Toggle */}
        <div className="ml-auto flex items-center gap-2">
          {pathname !== "/estimations/new" && (
            <Link
              href="/estimations/new"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90"
            >
              <Plus className="size-3.5" />
              <span>Estimasi Baru</span>
            </Link>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
