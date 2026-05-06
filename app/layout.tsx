import { CrmShell } from "@/components/crm/crm-shell";
import { DashboardAuthError, requireDashboardActor } from "@/lib/app/auth";
import { getCrmNavSnapshot } from "@/lib/dashboard/queries";
import { PageTransition } from "@/components/ui/page-transition";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Outreach CRM",
  description: "Internal AI automation outreach CRM"
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/api/");

  if (isPublicRoute) {
    return (
      <html lang="en" className={inter.className}>
        <body className="antialiased">{children}</body>
      </html>
    );
  }

  let actor;
  try {
    actor = await requireDashboardActor();
  } catch (error) {
    if (error instanceof DashboardAuthError && error.code === "auth_required") {
      redirect(`/login?next=${encodeURIComponent(pathname)}`);
    }

    return (
      <html lang="en" className={inter.className}>
        <body className="antialiased">
          <main className="auth-page">
            <section className="auth-panel">
              <h1>Access denied</h1>
              <p className="muted">Your dashboard account is inactive or does not have access to this CRM route.</p>
            </section>
          </main>
        </body>
      </html>
    );
  }

  const navSnapshot = await getCrmNavSnapshot();

  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        <CrmShell
          initialInboxUnhandled={navSnapshot.inboxUnhandled}
          initialReviewPending={navSnapshot.reviewPending}
          initialGlobalPaused={navSnapshot.globalPaused}
          founderName={actor.displayName}
        >
          <PageTransition>{children}</PageTransition>
        </CrmShell>
      </body>
    </html>
  );
}
