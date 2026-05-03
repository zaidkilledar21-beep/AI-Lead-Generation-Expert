import { CrmShell } from "@/components/crm/crm-shell";
import { requireAppActor } from "@/lib/app/auth";
import { getCrmNavSnapshot } from "@/lib/dashboard/queries";
import { PageTransition } from "@/components/ui/page-transition";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
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
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        <CrmShell
          initialInboxUnhandled={navSnapshot.inboxUnhandled}
          initialReviewPending={navSnapshot.reviewPending}
          initialGlobalPaused={navSnapshot.globalPaused}
          founderName={actor?.displayName ?? "Founder"}
        >
          <PageTransition>{children}</PageTransition>
        </CrmShell>
      </body>
    </html>
  );
}
