import { describeIncompleteConfig, getAiConfigView } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";
import { requireScope } from "@/lib/workspace";

import { SettingsForms } from "./settings-forms";

export default async function SettingsPage() {
  const { workspaceId } = await requireScope();

  const [ai, workspace] = await Promise.all([
    getAiConfigView(workspaceId),
    prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { companyName: true, address: true, contact: true, bankInfo: true, terms: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-[26px] leading-tight font-bold">Settings</h1>
        <p className="text-muted-foreground text-[13px]">
          Provider AI (API key milik Anda sendiri) untuk analisis requirement dan identitas yang tampil di PDF penawaran.
        </p>
      </header>

      <SettingsForms ai={ai} aiProblem={describeIncompleteConfig(ai)} branding={workspace} />
    </div>
  );
}
