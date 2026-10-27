import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: { default: "SweetProfit", template: "%s · SweetProfit" },
  description: "Calcolatore professionale di costi e prezzi per la pasticceria artigianale.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#842A42", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
