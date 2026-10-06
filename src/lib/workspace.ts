import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface Scope {
  userId: string;
  workspaceId: string;
}

/**
 * Satu-satunya pintu masuk untuk semua query bisnis (§4 Multi-Tenancy).
 * Server action / page WAJIB memanggil ini dan memakai `workspaceId` yang
 * dikembalikan sebagai filter — jangan pernah percaya workspaceId dari client.
 */
export async function requireScope(): Promise<Scope> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  if (membership) return { userId, workspaceId: membership.workspaceId };

  // User hasil OAuth belum punya workspace — buat sekarang (role OWNER).
  const created = await createWorkspaceFor(userId);
  return { userId, workspaceId: created };
}

export async function createWorkspaceFor(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `Workspace ${user?.name ?? user?.email ?? "Baru"}`,
      members: { create: { userId, role: "OWNER" } },
      pricingProfiles: {
        create: {
          name: "Freelance Standard",
          isDefault: true,
          rules: {
            create: [
              { complexity: "SIMPLE", price: 100_000 },
              { complexity: "MEDIUM", price: 200_000 },
              { complexity: "COMPLEX", price: 300_000 },
            ],
          },
        },
      },
    },
    select: { id: true },
  });

  return workspace.id;
}
