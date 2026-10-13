"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  History,
  LayoutDashboard,
  Plus,
  Settings,
  Tag,
  ChevronRight,
  X,
} from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { TaskPricerLogo } from "@/components/logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "Riwayat", icon: History },
  { href: "/pricing", label: "Pekerjaan & Tarif", icon: Tag },
  { href: "/settings", label: "Pengaturan AI", icon: Settings },
];

export function AppSidebar({
  name,
  email,
  initials,
}: {
  name: string;
  email: string;
  initials: string;
}) {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* 1. Header Sidebar: Brand + Close button on mobile */}
      <SidebarHeader className="border-none">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={() => isMobile && setOpenMobile(false)}
            className={cn(
              "flex items-center gap-2.5 overflow-hidden rounded-lg p-1 transition hover:bg-sidebar-accent",
              isCollapsed && "justify-center w-full"
            )}
          >
            <TaskPricerLogo size={28} variant="tag" className="size-7 rounded-lg shadow-xs shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col text-left">
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
                  TaskPricer
                </span>
                <span className="text-[10px] text-sidebar-foreground/60 leading-none">
                  Workspace Pro
                </span>
              </div>
            )}
          </Link>

          {isMobile && (
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              className="inline-flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent transition"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      {/* 2. Content Sidebar */}
      <SidebarContent>
        {/* Quick Action Button: New Estimation */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link
                href="/estimations/new"
                onClick={() => isMobile && setOpenMobile(false)}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90",
                  isCollapsed && "justify-center px-0"
                )}
                title="Estimasi Baru"
              >
                <Plus className="size-3.5 shrink-0" />
                {!isCollapsed && <span>Estimasi Baru</span>}
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Main Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <SidebarMenuItem key={href}>
                  <Link
                    href={href}
                    onClick={() => isMobile && setOpenMobile(false)}
                    className="w-full"
                    title={isCollapsed ? label : undefined}
                  >
                    <SidebarMenuButton isActive={isActive}>
                      <Icon className="size-4 shrink-0" />
                      {!isCollapsed && <span>{label}</span>}
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/*
        3. Footer Sidebar: menuju halaman Profil. Dulu dropdown, tapi isinya hanya mengulang
        nav utama (Dashboard / Profil Harga / Pengaturan AI) plus tombol keluar — keduanya
        kini ada di halaman Profil, jadi satu klik langsung ke sana.
      */}
      <SidebarFooter>
        <Link
          href="/profile"
          aria-label="Profil dan identitas perusahaan"
          className={cn(
            "flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-xs transition hover:bg-sidebar-accent outline-none",
            pathname.startsWith("/profile") && "bg-sidebar-accent",
            isCollapsed && "justify-center p-1"
          )}
        >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-xs">
              {initials}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate font-semibold text-sidebar-foreground">{name}</span>
                  <span className="truncate text-[10px] text-sidebar-foreground/60">{email}</span>
                </div>
                <ChevronRight className="size-3.5 text-sidebar-foreground/50 shrink-0" />
              </>
            )}
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
