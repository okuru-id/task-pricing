import { privateEndpointsAllowed } from "@/lib/ai/guarded-fetch";
import { describeIncompleteConfig, getAiConfigView } from "@/lib/ai/provider";
import { listJobProfiles } from "@/lib/data/job-profiles";
import { requireScope } from "@/lib/workspace";

import { JobProfileForms } from "./job-profile-forms";
import { SettingsForms } from "./settings-forms";

export default async function SettingsPage() {
  const { workspaceId } = await requireScope();
  const [ai, jobProfiles] = await Promise.all([
    getAiConfigView(workspaceId),
    listJobProfiles(workspaceId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-[22px] leading-tight font-bold lg:text-[26px]">Pengaturan AI</h1>
        <p className="text-muted-foreground text-[13px]">
          Provider AI dengan API key milik Anda sendiri, dan profil pekerjaan yang menentukan
          cara AI menilai tiap jenis pekerjaan. Identitas perusahaan ada di halaman Profil.
        </p>
      </header>

      <JobProfileForms profiles={jobProfiles} />

      <SettingsForms
        ai={ai}
        aiProblem={describeIncompleteConfig(ai)}
        allowPrivate={privateEndpointsAllowed()}
      />
    </div>
  );
}
