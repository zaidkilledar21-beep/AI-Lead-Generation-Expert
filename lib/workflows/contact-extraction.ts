export type EmailSelection = {
  email: string | null;
  confidence: "high" | "medium" | "low" | "none";
  reason: string;
};

const MAX_CONTACT_SCAN_CHARS = 400_000;
const blockedEmailDomains = new Set(["example.com", "example.org", "example.net", "test.com", "localhost"]);
const genericEmailPrefixes = new Set(["noreply", "no-reply", "donotreply", "do-not-reply"]);
const preferredEmailPrefixes = ["sales", "contact", "info", "hello", "team", "admin", "office", "support"];
const rejectedEmailTlds = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "css", "js", "ico", "avif", "pdf"]);
const assetLocalMarkers = ["logo", "icon", "sprite", "image", "img", "cropped", "artboard", "@2x", "@3x", "@4x"];
const blockTags = ["script", "style", "svg", "noscript"];
const mailtoDelimiters = new Set(["\"", "'", "?", "#", " ", "\t", "\n", "\r", ">"]);
const edgeTrimChars = new Set(["<", ">", "\"", "'", "(", ")", "[", "]", ",", ";", ":"]);
const emailLocalChars = new Set("abcdefghijklmnopqrstuvwxyz0123456789.!#$%&'*+/=?^_`{|}~-");
const emailDomainChars = new Set("abcdefghijklmnopqrstuvwxyz0123456789.-");
const phoneChars = new Set("+0123456789 ().-");

function capScanInput(value: string) {
  return value.length > MAX_CONTACT_SCAN_CHARS ? value.slice(0, MAX_CONTACT_SCAN_CHARS) : value;
}

function replaceAllCaseInsensitive(value: string, token: string, replacement: string) {
  let output = "";
  let index = 0;
  const lower = value.toLowerCase();
  const needle = token.toLowerCase();
  while (index < value.length) {
    const found = lower.indexOf(needle, index);
    if (found < 0) {
      output += value.slice(index);
      break;
    }
    output += value.slice(index, found) + replacement;
    index = found + token.length;
  }
  return output;
}

function decodeHtmlEntities(value: string) {
  return [
    ["&commat;", "@"],
    ["&#64;", "@"],
    ["&period;", "."],
    ["&#46;", "."],
    ["&dot;", "."],
    ["&amp;", "&"],
    ["&nbsp;", " "],
    ["&lt;", "<"],
    ["&gt;", ">"],
    ["&quot;", "\""],
    ["&#39;", "'"]
  ].reduce((current, [token, replacement]) => replaceAllCaseInsensitive(current, token, replacement), value);
}

function startsWithAt(value: string, index: number, token: string) {
  return value.slice(index, index + token.length).toLowerCase() === token;
}

function skipComment(value: string, index: number) {
  const end = value.indexOf("-->", index + 4);
  return end < 0 ? value.length : end + 3;
}

function skipBlockTag(value: string, index: number) {
  for (const tag of blockTags) {
    if (startsWithAt(value, index, `<${tag}`)) {
      const close = value.toLowerCase().indexOf(`</${tag}>`, index + tag.length + 1);
      return close < 0 ? value.length : close + tag.length + 3;
    }
  }
  return index;
}

export function stripNonVisibleHtml(html: string) {
  const input = decodeHtmlEntities(capScanInput(html));
  let output = "";
  let index = 0;

  while (index < input.length) {
    if (startsWithAt(input, index, "<!--")) {
      output += " ";
      index = skipComment(input, index);
      continue;
    }

    const afterBlock = input[index] === "<" ? skipBlockTag(input, index) : index;
    if (afterBlock !== index) {
      output += " ";
      index = afterBlock;
      continue;
    }

    output += input[index];
    index += 1;
  }

  return output;
}

function stripHtmlTags(value: string) {
  let output = "";
  let inTag = false;
  for (const char of value) {
    if (char === "<") {
      inTag = true;
      output += " ";
    } else if (char === ">") {
      inTag = false;
      output += " ";
    } else if (!inTag) {
      output += char;
    }
  }
  return output;
}

export function normalizeDomain(value?: string | null) {
  if (!value) return null;
  try {
    const url = value.toLowerCase().startsWith("http://") || value.toLowerCase().startsWith("https://")
      ? value
      : `https://${value}`;
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return null;
  }
}

function trimEdgePunctuation(value: string) {
  let start = 0;
  let end = value.length;
  while (start < end && edgeTrimChars.has(value[start])) start += 1;
  while (end > start && edgeTrimChars.has(value[end - 1])) end -= 1;
  return value.slice(start, end);
}

function normalizeEmailCandidate(value: string) {
  const decoded = decodeHtmlEntities(value).trim();
  const withoutMailto = decoded.toLowerCase().startsWith("mailto:") ? decoded.slice(7) : decoded;
  return trimEdgePunctuation(withoutMailto).toLowerCase();
}

function hasOnlyChars(value: string, allowed: Set<string>) {
  for (const char of value) {
    if (!allowed.has(char)) return false;
  }
  return true;
}

function hasDoubleDot(value: string) {
  for (let index = 1; index < value.length; index += 1) {
    if (value[index] === "." && value[index - 1] === ".") return true;
  }
  return false;
}

function hasDigit(value: string) {
  for (const char of value) {
    if (char >= "0" && char <= "9") return true;
  }
  return false;
}

function isAssetLikeLocal(local: string) {
  return assetLocalMarkers.some((marker) => local.includes(marker));
}

function isValidDomain(domain: string) {
  if (!domain || domain.length > 253 || domain.includes("/") || domain.includes("?") || domain.includes("#")) return false;
  if (hasDoubleDot(domain) || !hasOnlyChars(domain, emailDomainChars)) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (!label || label.startsWith("-") || label.endsWith("-")) return false;
  }

  const tld = labels.at(-1) ?? "";
  return tld.length >= 2 && tld.length <= 24 && !hasDigit(tld) && !rejectedEmailTlds.has(tld);
}

export function isValidBusinessEmail(value?: string | null) {
  if (!value) return false;
  const email = normalizeEmailCandidate(value);
  if (email.includes("/") || email.includes("?") || email.includes("#")) return false;

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) return false;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (!local || local.length > 64 || hasDoubleDot(local) || !hasOnlyChars(local, emailLocalChars)) return false;
  if (!isValidDomain(domain)) return false;
  if (blockedEmailDomains.has(domain) || isAssetLikeLocal(local)) return false;
  return true;
}

function extractMailtoEmails(html: string) {
  const lower = html.toLowerCase();
  const emails: string[] = [];
  let index = 0;
  while (index < lower.length) {
    const start = lower.indexOf("mailto:", index);
    if (start < 0) break;
    let end = start + 7;
    while (end < html.length && !mailtoDelimiters.has(html[end])) end += 1;
    emails.push(html.slice(start + 7, end));
    index = end + 1;
  }
  return emails;
}

function isLocalScanChar(char: string) {
  return emailLocalChars.has(char.toLowerCase());
}

function isDomainScanChar(char: string) {
  return emailDomainChars.has(char.toLowerCase());
}

function extractPlainEmails(text: string) {
  const emails = new Set<string>();
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "@") continue;

    let start = index - 1;
    while (start >= 0 && isLocalScanChar(text[start])) start -= 1;
    let end = index + 1;
    while (end < text.length && isDomainScanChar(text[end])) end += 1;

    const candidate = text.slice(start + 1, end);
    if (candidate.includes(".")) emails.add(candidate);
  }
  return [...emails];
}

function normalizeObfuscationToken(value: string) {
  const lower = value.toLowerCase();
  if (lower === "[at]" || lower === "(at)" || lower === "at") return "@";
  if (lower === "[dot]" || lower === "(dot)" || lower === "dot") return ".";
  return value;
}

function tokenizeWhitespace(value: string) {
  const tokens: string[] = [];
  let token = "";
  for (const char of value) {
    if (char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f") {
      if (token) {
        tokens.push(token);
        token = "";
      }
    } else {
      token += char;
    }
  }
  if (token) tokens.push(token);
  return tokens;
}

function extractObfuscatedEmails(text: string) {
  const tokens = tokenizeWhitespace(text.slice(0, MAX_CONTACT_SCAN_CHARS))
    .map((token) => trimEdgePunctuation(token))
    .filter(Boolean);
  const emails: string[] = [];

  for (let index = 0; index + 4 < tokens.length; index += 1) {
    const first = normalizeObfuscationToken(tokens[index]);
    const second = normalizeObfuscationToken(tokens[index + 1]);
    const third = normalizeObfuscationToken(tokens[index + 2]);
    const fourth = normalizeObfuscationToken(tokens[index + 3]);
    const fifth = normalizeObfuscationToken(tokens[index + 4]);
    if (second === "@" && fourth === ".") {
      emails.push(`${first}@${third}.${fifth}`);
    }
  }

  return emails;
}

export function extractBusinessEmailsFromHtml(html: string) {
  const visible = stripNonVisibleHtml(html);
  const text = stripHtmlTags(visible);
  const candidates = [
    ...extractMailtoEmails(visible),
    ...extractObfuscatedEmails(text),
    ...extractPlainEmails(text)
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

function compactPhone(value: string) {
  let output = "";
  for (const char of value) {
    if ((char >= "0" && char <= "9") || char === "+") output += char;
  }
  return output;
}

function digitsOnly(value: string) {
  let output = "";
  for (const char of value) {
    if (char >= "0" && char <= "9") output += char;
  }
  return output;
}

export function normalizePhone(value?: string | null) {
  if (!value) return null;
  const compact = compactPhone(value);
  const digits = digitsOnly(compact);
  if (digits.length < 8 || digits.length > 15) return null;
  if ((digits.startsWith("19") || digits.startsWith("20")) && digits.length === 8) return null;
  return compact.startsWith("+") ? `+${digits}` : digits;
}

function extractPhoneCandidates(text: string) {
  const candidates: string[] = [];
  let index = 0;
  while (index < text.length) {
    if (!phoneChars.has(text[index])) {
      index += 1;
      continue;
    }

    const start = index;
    let digitCount = 0;
    while (index < text.length && phoneChars.has(text[index])) {
      if (text[index] >= "0" && text[index] <= "9") digitCount += 1;
      index += 1;
    }

    if (digitCount >= 8) candidates.push(text.slice(start, index));
  }
  return candidates;
}

export function extractPhonesFromHtml(html: string) {
  const text = stripHtmlTags(stripNonVisibleHtml(html));
  return [...new Set(extractPhoneCandidates(text).map(normalizePhone).filter(Boolean))] as string[];
}
