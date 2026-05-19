import { describe, expect, it } from "vitest";
import {
  extractBusinessEmailsFromHtml,
  extractPhonesFromHtml,
  isValidBusinessEmail,
  normalizePhone,
  selectBestBusinessEmail
} from "@/lib/workflows/contact-extraction";

describe("contact extraction", () => {
  it("extracts visible, mailto, and obfuscated emails while ignoring script/style junk", () => {
    const html = `
      <script>const asset = "tracking@example.com";</script>
      <style>.icon{background:url(info@example.org.png)}</style>
      <a href="mailto:Sales@ClinicDubai.com?subject=Hi">email</a>
      <p>hello [at] clinicdubai [dot] com</p>
      <p>support@clinicdubai.com</p>
    `;

    expect(extractBusinessEmailsFromHtml(html)).toEqual([
      "sales@clinicdubai.com",
      "hello@clinicdubai.com",
      "support@clinicdubai.com"
    ]);
  });

  it("rejects malformed, placeholder, asset, and query-fragment emails", () => {
    expect(isValidBusinessEmail("person@example.com")).toBe(false);
    expect(isValidBusinessEmail("logo@brand.com.png")).toBe(false);
    expect(isValidBusinessEmail("sales@brand.com?subject=x")).toBe(false);
    expect(isValidBusinessEmail("sales@brand.c0m")).toBe(false);
    expect(isValidBusinessEmail("sales@brand.com")).toBe(true);
  });

  it("prefers useful business-domain emails over no-reply or non-domain addresses", () => {
    expect(selectBestBusinessEmail([
      "noreply@clinicdubai.com",
      "owner@gmail.com",
      "info@clinicdubai.com"
    ], "https://www.clinicdubai.com").email).toBe("info@clinicdubai.com");
  });

  it("normalizes phones and rejects short/date-like values", () => {
    expect(normalizePhone("+971 50 123 4567")).toBe("+971501234567");
    expect(normalizePhone("2024-01-01")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(extractPhonesFromHtml("<p>Call +971 (50) 123-4567</p>")).toEqual(["+971501234567"]);
  });
});
