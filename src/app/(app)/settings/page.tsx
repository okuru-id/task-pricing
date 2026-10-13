import { privateEndpointsAllowed } from "@/lib/ai/guarded-fetch";
import { describeIncompleteConfig, getAiConfigView } from "@/lib/ai/provider";
import { requireScope } from "@/lib/workspace";

import { SettingsForms } from "./settings-forms";

export default async function SettingsPage() {
  const { workspaceId } = await requireScope();
  const ai = await getAiConfigView(workspaceId);

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-[22px] leading-tight font-bold lg:text-[26px]">Pengaturan AI</h1>
        <p className="text-muted-foreground text-[13px]">
          Provider AI dengan API key milik Anda sendiri, dipakai untuk menganalisis requirement.
          Jenis pekerjaan dan tarifnya ada di halaman Profil Pekerjaan & Harga.
        </p>
      </header>

      <SettingsForms
        ai={ai}
        aiProblem={describeIncompleteConfig(ai)}
        allowPrivate={privateEndpointsAllowed()}
      />
    </div>
  );
}
