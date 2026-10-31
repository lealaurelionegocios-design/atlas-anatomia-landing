import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CleanFlow Business Manager", template: "%s · CleanFlow" },
  description: "Manage your cleaning business without complicated software.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#173F37",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
