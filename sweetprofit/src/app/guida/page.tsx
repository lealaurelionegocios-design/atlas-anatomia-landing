import type { Metadata } from "next";
import { GuidePage } from "@/features/guide/GuidePage";

export const metadata: Metadata = { title: "Guida rapida" };
export default function Page() {
  return <GuidePage />;
}
