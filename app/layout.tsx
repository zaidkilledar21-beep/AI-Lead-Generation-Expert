import type { Metadata } from "next";
import { CrmShell } from "@/components/crm/crm-shell";
import { requireAppActor } from "@/lib/app/auth";
import { getCrmNavSnapshot } from "@/lib/dashboard/queries";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outreach CRM",
  description: "Internal AI automation outreach CRM"
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [navSnapshot, actor] = await Promise.all([
    getCrmNavSnapshot(),
    requireAppActor().catch(() => null)
  ]);

  return (
    <html lang="en">
      <body>
        <CrmShell
          initialInboxUnhandled={navSnapshot.inboxUnhandled}
          initialReviewPending={navSnapshot.reviewPending}
          initialGlobalPaused={navSnapshot.globalPaused}
          founderName={actor?.displayName ?? "Founder"}
        >
          {children}
        </CrmShell>
      </body>
    </html>
  );
}
