import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const metadata: Metadata = { title: "Impostazioni" };
export default function Page() {
  return <SettingsPage />;
}
