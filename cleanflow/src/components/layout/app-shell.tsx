"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Calculator,
  CalendarDays,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { signOut } from "@/app/(auth)/actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function navItems(quoteTerm: string): NavItem[] {
  return [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/pricing", label: "Pricing Calculator", icon: Calculator },
    { href: "/quotes", label: quoteTerm, icon: FileText },
    { href: "/jobs", label: "Jobs & Bookings", icon: CalendarDays },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/payments", label: "Payments & Expenses", icon: Wallet },
    { href: "/documents", label: "Document Kit", icon: FolderOpen },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand text-white" : "text-mint/90 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBody({ items, businessName, market, onNavigate }: { items: NavItem[]; businessName: string; market: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-forest px-3 py-5">
      <div className="px-2">
        <Logo href="/dashboard" light />
      </div>
      <div className="mx-2 mt-5 rounded-lg bg-white/5 px-3 py-2">
        <p className="truncate text-sm font-medium text-white" title={businessName}>
          {businessName}
        </p>
        <p className="text-xs text-mint/70">{market === "UK" ? "United Kingdom · GBP" : "United States · USD"}</p>
      </div>
      <nav aria-label="Main" className="mt-5 flex-1 overflow-y-auto">
        <NavLinks items={items} onNavigate={onNavigate} />
      </nav>
      <form action={signOut} className="mt-4 border-t border-white/10 pt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-mint/90 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </form>
    </div>
  );
}

export function AppShell({
  businessName,
  market,
  quoteTerm,
  children,
}: {
  businessName: string;
  market: string;
  quoteTerm: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navItems(quoteTerm);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarBody items={items} businessName={businessName} market={market} />
      </aside>

      <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Logo href="/dashboard" />
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button type="button" className="rounded-lg p-2 text-forest hover:bg-mint" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-forest/50" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] focus:outline-none">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Dialog.Description className="sr-only">Main navigation menu</Dialog.Description>
              <SidebarBody items={items} businessName={businessName} market={market} onNavigate={() => setOpen(false)} />
              <Dialog.Close asChild>
                <button type="button" className="absolute right-3 top-4 rounded-lg p-2 text-white hover:bg-white/10" aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
