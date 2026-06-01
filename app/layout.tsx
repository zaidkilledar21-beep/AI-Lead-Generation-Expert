import { CrmShell } from "@/components/crm/crm-shell";
import { DashboardAuthError, requireDashboardActor } from "@/lib/app/auth";
import { getCrmNavSnapshot } from "@/lib/dashboard/queries";
import { PageTransition } from "@/components/ui/page-transition";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";

export const metadata = {
  title: "Outreach CRM",
  description: "Internal AI automation outreach CRM"
};

const bodyClassName = "min-h-screen bg-[var(--bg)] text-white antialiased";

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const isPublicRoute = pathname === "/login" || pathname === "/" || pathname.startsWith("/api/");

  if (isPublicRoute) {
    return (
      <html lang="en">
        <body className={bodyClassName}>{children}</body>
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
      <html lang="en">
        <body className={bodyClassName}>
          <main className="crm-state-shell">
            <section className="crm-state-panel auth-panel">
              <div className="crm-state-badge">Access restricted</div>
              <div className="crm-state-hero">
                <h1>Access denied</h1>
                <p>Your dashboard account is inactive or does not have access to this CRM route.</p>
              </div>
            </section>
          </main>
        </body>
      </html>
    );
  }

  const navSnapshot = await getCrmNavSnapshot();

  return (
    <html lang="en">
      <body className={bodyClassName}>
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
