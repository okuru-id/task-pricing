import { auth } from "@/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { requireScope } from "@/lib/workspace";

function initialsOf(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireScope(); // redirect ke /login bila belum autentikasi
  const session = await auth();

  const email = session?.user?.email ?? "";
  const name = session?.user?.name ?? email.split("@")[0] ?? "Pengguna";
  const initials = initialsOf(name || email);

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Sidebar Inset (New York v4 dashboard-01). Tombol keluar ada di halaman Profil. */}
      <AppSidebar name={name} email={email} initials={initials} />

      {/* Main Inset Panel dengan Header & Content Terpadu */}
      <SidebarInset>
        <AppHeader />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
