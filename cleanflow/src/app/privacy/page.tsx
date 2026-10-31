import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Privacy notice" };

// Template privacy notice. The operator must complete the bracketed details and
// have it reviewed before launch (see docs/PRIVACY_AND_COMPLIANCE.md).
export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto max-w-3xl px-4 py-4">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16 text-sm leading-relaxed">
        <h1 className="text-2xl font-semibold">Privacy notice</h1>
        <Alert tone="warning">Draft template — the operator of this service must complete the bracketed details and obtain legal review before launch.</Alert>
        <h2 className="pt-2 text-lg font-semibold">Who we are</h2>
        <p>CleanFlow Business Manager is operated by [Operator legal name, address, contact email]. For UK users, [Operator] is the controller of account data and acts as a processor for the client data you store.</p>
        <h2 className="pt-2 text-lg font-semibold">What we store</h2>
        <p>Your account email and password hash; your business settings; and the records you create — clients, estimates/quotes, jobs, checklists, invoices, payments and expenses.</p>
        <p>Do not store sensitive data such as alarm codes, key locations, payment card numbers, health information or government ID numbers. CleanFlow does not process card payments.</p>
        <h2 className="pt-2 text-lg font-semibold">How it is protected</h2>
        <p>Data is stored in a PostgreSQL database with row-level security so each business can only access its own records. Connections are encrypted in transit.</p>
        <h2 className="pt-2 text-lg font-semibold">Your controls</h2>
        <p>You can export all of your data (JSON/CSV) and delete individual clients or your entire account at any time from Settings → Data.</p>
        <h2 className="pt-2 text-lg font-semibold">Retention</h2>
        <p>Data is kept while your account is active. When you delete your account, it is removed from the live database immediately and from backups within [N] days.</p>
        <h2 className="pt-2 text-lg font-semibold">Your rights</h2>
        <p>Depending on where you live (for example under the UK GDPR or US state privacy laws such as the CCPA/CPRA), you may have rights to access, correct, delete or port your data. Contact [email].</p>
      </main>
    </div>
  );
}
