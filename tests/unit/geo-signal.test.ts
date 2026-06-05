import { describe, expect, it } from "vitest";
import { buildGeoSignalData } from "@/lib/crm/queries";

describe("buildGeoSignalData", () => {
  it("aggregates leads, replied leads, and positive intent by clean geography", () => {
    const rows = buildGeoSignalData([
      { country: "United Arab Emirates", city: "Dubai", replyCount: 1, latestReplyIntent: "positive_interest" },
      { country: "United Arab Emirates", city: "Dubai", replyCount: 0, latestReplyIntent: null },
      { country: "United Arab Emirates", city: "Abu Dhabi", replyCount: 2, latestReplyIntent: "not_interested" }
    ]);

    expect(rows[0]).toMatchObject({
      geography: "United Arab Emirates",
      leads: 3,
      repliedLeads: 2,
      positive: 1,
      signalLabel: "Strong"
    });
    expect(rows[0].replyRate).toBeCloseTo(2 / 3);
    expect(rows[0].positiveRate).toBeCloseTo(1 / 2);
  });

  it("falls back to city when the country field looks address-like", () => {
    const rows = buildGeoSignalData([
      {
        country: "Building B320 - Tower C, Business Bay, Dubai, United Arab Emirates",
        city: "Dubai",
        replyCount: 1,
        latestReplyIntent: "positive_interest"
      },
      {
        country: "Building B320 - Tower C, Business Bay, Dubai, United Arab Emirates",
        city: "Dubai",
        replyCount: 0,
        latestReplyIntent: null
      }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      geography: "Dubai",
      rawGeography: "Building B320 - Tower C, Business Bay, Dubai, United Arab Emirates",
      leads: 2,
      repliedLeads: 1
    });
  });

  it("groups unusable location values as unverified geography", () => {
    const rows = buildGeoSignalData([
      { country: "123 Long Address / Missing City", city: "", replyCount: 0, latestReplyIntent: null },
      { country: null, city: null, replyCount: 0, latestReplyIntent: null }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      geography: "Unverified geography",
      leads: 2,
      repliedLeads: 0,
      positive: 0,
      replyRate: 0,
      positiveRate: 0,
      signalScore: 0,
      signalLabel: "No signal"
    });
  });

  it("keeps tiny samples from being labeled as strong", () => {
    const rows = buildGeoSignalData([
      { country: "Qatar", city: "Doha", replyCount: 1, latestReplyIntent: "positive_interest" },
      { country: "Saudi Arabia", city: "Riyadh", replyCount: 0, latestReplyIntent: null },
      { country: "Saudi Arabia", city: "Jeddah", replyCount: 1, latestReplyIntent: "positive_interest" },
      { country: "Saudi Arabia", city: "Dammam", replyCount: 1, latestReplyIntent: "positive_interest" }
    ]);

    const qatar = rows.find((row) => row.geography === "Qatar");
    const saudiArabia = rows.find((row) => row.geography === "Saudi Arabia");

    expect(qatar?.signalLabel).toBe("Low sample");
    expect(saudiArabia?.signalLabel).toBe("Strong");
    expect(rows[0].geography).toBe("Saudi Arabia");
  });
});
