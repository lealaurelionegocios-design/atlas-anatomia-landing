"use client";

import { Toaster } from "sonner";
import { AppStoreProvider } from "@/lib/store/AppStore";
import { AppShell } from "./AppShell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppStoreProvider>
      <AppShell>{children}</AppShell>
      <Toaster
        position="bottom-right"
        toastOptions={{ className: "!rounded-xl !border-line !bg-white !text-ink !shadow-lift !font-sans" }}
      />
    </AppStoreProvider>
  );
}
