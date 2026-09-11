import type { Metadata } from "next";
import { SystemSettings } from "@/components/system-settings";
import { getPortalIdentity } from "@/lib/backend-auth";

export const metadata: Metadata = { title: "설정 | Settings" };

export default async function SettingsPage() {
  const identity = await getPortalIdentity();
  return <SystemSettings isAdmin={identity.roles.includes("admin")} />;
}
