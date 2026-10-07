import { LogOut } from "lucide-react";

import { auth, signOut } from "@/auth";
import { Sidebar } from "@/components/sidebar";
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

  return (
    <div className="flex min-h-svh">
      <Sidebar
        name={name}
        email={email}
        initials={initialsOf(name || email)}
        signOutSlot={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              title="Keluar"
              className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        }
      />

      {/* pb besar di mobile menyediakan ruang untuk tab bar + tombol melayang. */}
      <main className="min-w-0 flex-1 px-4 pt-6 pb-28 lg:p-7">{children}</main>
    </div>
  );
}
