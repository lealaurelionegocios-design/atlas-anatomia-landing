import { AppShell } from "@/components/layout/app-shell";
import { requireBusiness } from "@/lib/server/context";
import { marketConfig } from "@/lib/market";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { business } = await requireBusiness();
  return (
    <AppShell businessName={business.name} market={business.market} quoteTerm={marketConfig(business.market).terms.quotes}>
      {children}
    </AppShell>
  );
}
