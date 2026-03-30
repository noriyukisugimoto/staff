import { SettingsPasswordClient } from "@/components/settings-password-client";
import { requireSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();
  if (!session) {
    return null;
  }

  return (
    <section className="grid">
      <h1>設定</h1>
      <SettingsPasswordClient />
    </section>
  );
}
