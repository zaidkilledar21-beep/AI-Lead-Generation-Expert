import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineListView } from "@/components/crm/pipeline-list-view";

vi.mock("@/lib/crm/actions", () => ({
  approveLeadWithFeedbackAction: vi.fn(),
  changeLeadStatusAction: vi.fn(),
  bulkApproveLeadsAction: vi.fn(),
  bulkAssignLeadsAction: vi.fn(),
  bulkChangeLeadStatusAction: vi.fn()
}));

function row(overrides: Record<string, unknown>) {
  return {
    id: "lead-1",
    businessName: "Acme Automation",
    city: "Dubai",
    country: "United Arab Emirates",
    status: "queued",
    approvedForOutreach: false,
    email: "owner@example.com",
    score: 72,
    effectiveBand: "B",
    campaignName: "SMB Outreach",
    latestReplyIntent: null,
    hasUnhandledReply: false,
    replyCount: 0,
    assignedTo: null,
    hasPendingReview: false,
    ...overrides
  };
}

function renderList(rows: Array<Record<string, unknown>>, globalOutreachPaused = false) {
  render(<PipelineListView filtered={rows} profiles={[]} globalOutreachPaused={globalOutreachPaused} />);
}

describe("PipelineListView approval eligibility", () => {
  beforeEach(() => {
    class TestIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
  });

  it("shows an approve button for an eligible row", () => {
    renderList([row({})]);

    expect(within(screen.getByRole("row", { name: /Acme Automation/i })).getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });

  it("blocks rows missing required approval prerequisites", () => {
    renderList([
      row({ id: "missing-email", businessName: "Missing Email LLC", email: null }),
      row({ id: "missing-score", businessName: "Missing Score LLC", score: null, effectiveBand: null }),
      row({ id: "replied", businessName: "Replied LLC", replyCount: 1, latestReplyIntent: "positive_interest" })
    ]);

    expect(within(screen.getByRole("row", { name: /Missing Email LLC/i })).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByText("Missing email")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Missing Score LLC/i })).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByText("Missing score")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Replied LLC/i })).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByText("Reply received")).toBeInTheDocument();
  });

  it("blocks approvals while global outreach is paused", () => {
    renderList([row({ businessName: "Paused Outreach LLC" })], true);

    expect(within(screen.getByRole("row", { name: /Paused Outreach LLC/i })).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.getByText("Global pause")).toBeInTheDocument();
  });
});
