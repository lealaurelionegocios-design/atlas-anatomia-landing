import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-forest p-10 text-white lg:flex">
        <Logo light />
        <div>
          <p className="text-3xl font-semibold leading-tight text-white">Manage your cleaning business without complicated software.</p>
          <ul className="mt-6 space-y-2 text-mint/90">
            <li>✓ Clients, estimates and quotes in one place</li>
            <li>✓ Bookings with checklists your team can follow</li>
            <li>✓ Invoices, payments and a clear view of your numbers</li>
          </ul>
        </div>
        <p className="text-xs text-mint/70">Built for self-employed cleaners and small teams in the US and UK.</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
