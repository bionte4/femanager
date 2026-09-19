import { redirect } from "next/navigation";

/** Alias lama → kartu channel ada di sidebar Integrations */
export default function IntegrationsSettingsPage() {
  redirect("/admin/integrations#channels");
}
