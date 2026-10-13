import { LogOut } from "lucide-react";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

import { BrandingForm } from "./branding-form";

function initialsOf(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ProfilePage() {
  const { workspaceId } = await requireScope();
  const session = await auth();

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: {
      name: true,
      companyName: true,
      address: true,
      contact: true,
      bankInfo: true,
      terms: true,
    },
  });

  const email = session?.user?.email ?? "";
  const name = session?.user?.name ?? email.split("@")[0] ?? "Pengguna";

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-[22px] leading-tight font-bold lg:text-[26px]">Profil</h1>
        <p className="text-muted-foreground text-[13px]">
          Akun Anda dan identitas yang tampil di penawaran untuk klien.
        </p>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="bg-card max-w-2xl space-y-4 rounded-[10px] border p-4 lg:p-5">
          <div>
            <h2 className="text-[15px] font-semibold">Akun</h2>
            <p className="text-muted-foreground text-xs">
              Workspace: {workspace.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold">
              {initialsOf(name || email)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-muted-foreground truncate text-xs">{email}</p>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="text-danger max-lg:h-10 max-lg:w-full"
            >
              <LogOut className="size-4" />
              Keluar
            </Button>
          </form>
        </section>

        <BrandingForm branding={workspace} />
      </div>
    </div>
  );
}
