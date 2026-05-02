import type { Metadata } from "next";
import { CrmShell } from "@/components/crm/crm-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outreach CRM",
  description: "Internal AI automation outreach CRM"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CrmShell>{children}</CrmShell>
      </body>
    </html>
  );
}
