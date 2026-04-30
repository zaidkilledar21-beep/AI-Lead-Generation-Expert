import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Automation Lead Engine",
  description: "Internal lead generation and outreach operations dashboard"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="brand">AI Automation Lead Engine</div>
            <nav className="nav" aria-label="Primary">
              <a href="/">Pipeline</a>
              <a href="/campaigns">Campaigns</a>
              <a href="/manual-review">Review</a>
              <a href="/metrics">Metrics</a>
              <a href="/login">Sign in</a>
            </nav>
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
