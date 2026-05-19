import dns from "node:dns/promises";
import net from "node:net";
import { extractBusinessEmailsFromHtml, extractPhonesFromHtml, normalizeDomain, selectBestBusinessEmail } from "@/lib/workflows/contact-extraction";

export type CrawlPage = {
  url: string;
  html: string;
};

export type CrawlResult = {
  status: "success" | "failed" | "skipped";
  pages: CrawlPage[];
  summary: string;
  error?: string;
};

const defaultPaths = ["", "/contact", "/contact-us", "/about", "/services", "/booking"];
const blockedExtensions = /\.(?:pdf|jpg|jpeg|png|gif|webp|svg|ico|mp4|mov|avi|zip|rar|7z|css|js|xml)$/i;

function getNumberEnv(key: string, fallback: number) {
  const raw = process.env[key];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isPrivateIp(address: string) {
  if (net.isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    );
  }

  const lower = address.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
}

async function assertSafeHttpUrl(url: string) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https website URLs can be crawled");
  }
  if (blockedExtensions.test(parsed.pathname)) {
    throw new Error("Media and file URLs are not crawled");
  }

  const records = await dns.lookup(parsed.hostname, { all: true });
  if (records.some((record) => isPrivateIp(record.address))) {
    throw new Error("Private, loopback, and link-local addresses are blocked");
  }
}

async function robotsAllows(origin: string) {
  try {
    const robotsUrl = `${origin}/robots.txt`;
    await assertSafeHttpUrl(robotsUrl);
    const response = await fetch(robotsUrl, {
      headers: { "user-agent": "AI Automation Lead Engine/0.1" },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return true;

    const body = (await response.text()).toLowerCase();
    return !body.includes("user-agent: *\ndisallow: /");
  } catch {
    return true;
  }
}

async function fetchHtml(url: string, timeoutMs: number, maxBytes: number, redirectsLeft = 3): Promise<string> {
  await assertSafeHttpUrl(url);

  const response = await fetch(url, {
    headers: { "user-agent": "AI Automation Lead Engine/0.1" },
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs)
  });

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirectsLeft <= 0) throw new Error("Redirect limit exceeded");
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect without location");
    return fetchHtml(new URL(location, url).toString(), timeoutMs, maxBytes, redirectsLeft - 1);
  }

  if (!response.ok) throw new Error(`Fetch failed ${response.status}`);

  const type = response.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("text/html")) throw new Error("Only HTML pages are crawled");

  const text = await response.text();
  return text.slice(0, maxBytes);
}

export async function crawlBusinessWebsite(websiteUrl?: string | null): Promise<CrawlResult> {
  if (!websiteUrl) {
    return { status: "skipped", pages: [], summary: "No websiteUri available" };
  }

  try {
    const origin = new URL(websiteUrl).origin;
    const maxPages = getNumberEnv("CRAWL_MAX_PAGES_PER_LEAD", 6);
    const timeoutMs = getNumberEnv("CRAWL_TIMEOUT_MS", 12000);
    const maxBytes = getNumberEnv("CRAWL_MAX_BYTES_PER_PAGE", 500000);

    if (!(await robotsAllows(origin))) {
      return { status: "skipped", pages: [], summary: "robots.txt disallows crawling" };
    }

    const pages: CrawlPage[] = [];
    for (const path of defaultPaths.slice(0, maxPages)) {
      try {
        const url = path ? `${origin}${path}` : websiteUrl;
        pages.push({ url, html: await fetchHtml(url, timeoutMs, maxBytes) });
      } catch {
        // Missing secondary pages should not fail the full crawl.
      }
    }

    if (pages.length === 0) {
      return { status: "failed", pages: [], summary: "No crawlable HTML pages found", error: "No crawlable HTML pages found" };
    }

    return {
      status: "success",
      pages,
      summary: `Fetched ${pages.length} HTML page${pages.length === 1 ? "" : "s"} from Places websiteUri`
    };
  } catch (error) {
    return {
      status: "failed",
      pages: [],
      summary: "Website crawl failed",
      error: error instanceof Error ? error.message : "Unknown crawl failure"
    };
  }
}

export function extractWebsiteSignals(pages: CrawlPage[]) {
  const combinedHtml = pages.map((page) => page.html).join("\n");
  const combined = combinedHtml.toLowerCase();
  const websiteDomain = normalizeDomain(pages[0]?.url);
  const emails = [...new Set(pages.flatMap((page) => extractBusinessEmailsFromHtml(page.html)))];
  const emailSelection = selectBestBusinessEmail(emails, websiteDomain);
  const phones = [...new Set(pages.flatMap((page) => extractPhonesFromHtml(page.html)))].slice(0, 5);

  return {
    emails,
    selected_email: emailSelection.email,
    email_confidence: emailSelection.confidence,
    email_reason: emailSelection.reason,
    phones,
    booking_link_found: ["book now", "calendly", "appointment", "calendar"].some((term) => combined.includes(term)),
    contact_form_found: ["<form", "contact form", "submit"].some((term) => combined.includes(term)),
    whatsapp_found: combined.includes("whatsapp") || combined.includes("wa.me"),
    chat_widget_found: ["intercom", "tawk.to", "livechat", "drift"].some((term) => combined.includes(term)),
    raw_scrape_summary: [
      combined.includes("whatsapp") || combined.includes("wa.me") ? "whatsapp visible" : null,
      ["book now", "calendly", "appointment", "calendar"].some((term) => combined.includes(term)) ? "booking signal visible" : null,
      ["<form", "contact form", "submit"].some((term) => combined.includes(term)) ? "contact form visible" : null
    ].filter(Boolean).join("; ")
  };
}
