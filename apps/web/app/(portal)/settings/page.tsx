import type { Metadata } from "next";
import { SystemSettings } from "@/components/system-settings";

export const metadata: Metadata = { title: "설정 | Settings" };

export default function SettingsPage() {
  return <SystemSettings />;
}
