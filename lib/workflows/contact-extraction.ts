export type EmailSelection = {
  email: string | null;
  confidence: "high" | "medium" | "low" | "none";
  reason: string;
};

const blockedEmailDomains = new Set(["example.com", "example.org", "example.net", "test.com", "localhost"]);
const genericEmailPrefixes = new Set(["noreply", "no-reply", "donotreply", "do-not-reply"]);
const preferredEmailPrefixes = ["sales", "contact", "info", "hello", "team", "admin", "office", "support"];

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&commat;/gi, "@")
    .replace(/&#64;/g, "@")
    .replace(/&period;/gi, ".")
    .replace(/&#46;/g, ".")
    .replace(/&dot;/gi, ".")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'");
}

export function stripNonVisibleHtml(html: string) {
  return decodeHtmlEntities(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ");
}

export function normalizeDomain(value?: string | null) {
  if (!value) return null;
  try {
    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeEmailCandidate(value: string) {
  return decodeHtmlEntities(value)
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/[<>"'()[\],;:]+$/g, "")
    .replace(/^[<>"'()[\],;:]+/g, "")
    .toLowerCase();
}

export function isValidBusinessEmail(value?: string | null) {
  if (!value) return false;
  const email = normalizeEmailCandidate(value);
  if (email.includes("/") || email.includes("?") || email.includes("#")) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email)) return false;

  const [local, domain] = email.split("@");
  const tld = domain.split(".").at(-1) ?? "";
  if (!local || local.length > 64 || domain.length > 253) return false;
  if (tld.length < 2 || tld.length > 24 || /\d/.test(tld)) return false;
  if (blockedEmailDomains.has(domain)) return false;
  if (/\.(png|jpe?g|gif|webp|svg|css|js|ico|pdf)$/i.test(email)) return false;
  if (local.includes("..") || domain.includes("..")) return false;
  return true;
}

function extractMailtoEmails(html: string) {
  return [...html.matchAll(/mailto:([^"'?\s>]+)/gi)].map((match) => match[1]);
}

function extractObfuscatedEmails(text: string) {
  return [...text.matchAll(/\b([a-z0-9._%+-]+)\s*(?:\[at\]|\(at\)|\sat\s)\s*([a-z0-9.-]+)\s*(?:\[dot\]|\(dot\)|\sdot\s)\s*([a-z]{2,24})\b/gi)]
    .map((match) => `${match[1]}@${match[2]}.${match[3]}`);
}

export function extractBusinessEmailsFromHtml(html: string) {
  const visible = stripNonVisibleHtml(html);
  const text = visible.replace(/<[^>]+>/g, " ");
  const candidates = [
    ...extractMailtoEmails(visible),
    ...extractObfuscatedEmails(text),
    ...(text.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi) ?? [])
  ].map(normalizeEmailCandidate);

  return [...new Set(candidates)].filter(isValidBusinessEmail);
}

function emailRank(email: string, websiteDomain?: string | null) {
  const domain = email.split("@")[1];
  const local = email.split("@")[0];
  const isSameDomain = Boolean(websiteDomain && domain === websiteDomain);
  const isPreferred = preferredEmailPrefixes.some((prefix) => local === prefix || local.startsWith(`${prefix}.`));
  const isGeneric = genericEmailPrefixes.has(local);

  if (isSameDomain && isPreferred) return 400;
  if (isSameDomain && !isGeneric) return 300;
  if (!isGeneric) return 200;
  return 50;
}

export function selectBestBusinessEmail(emails: Array<string | null | undefined>, websiteDomain?: string | null): EmailSelection {
  const normalizedDomain = normalizeDomain(websiteDomain);
  const valid = [...new Set(emails.map((email) => normalizeEmailCandidate(email ?? "")).filter(isValidBusinessEmail))];
  if (valid.length === 0) return { email: null, confidence: "none", reason: "no_valid_email" };

  const sorted = valid.sort((a, b) => emailRank(b, normalizedDomain) - emailRank(a, normalizedDomain) || a.localeCompare(b));
  const email = sorted[0];
  const local = email.split("@")[0];
  const domain = email.split("@")[1];
  const sameDomain = normalizedDomain && domain === normalizedDomain;
  const generic = genericEmailPrefixes.has(local);

  if (sameDomain && !generic) return { email, confidence: "high", reason: "business_domain_email" };
  if (!generic) return { email, confidence: "medium", reason: "valid_non_domain_business_email" };
  return { email, confidence: "low", reason: "generic_or_no_reply_email" };
}

export function normalizePhone(value?: string | null) {
  if (!value) return null;
  const compact = value.replace(/[^\d+]/g, "");
  const digits = compact.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (/^(19|20)\d{6}$/.test(digits)) return null;
  return compact.startsWith("+") ? `+${digits}` : digits;
}

export function extractPhonesFromHtml(html: string) {
  const text = stripNonVisibleHtml(html).replace(/<[^>]+>/g, " ");
  return [...new Set((text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? []).map(normalizePhone).filter(Boolean))] as string[];
}
