import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CRM_REALTIME_REFRESH_DELAY_MS, useCrmRealtime } from "@/lib/hooks/use-crm-realtime";

const refreshMock = vi.hoisted(() => vi.fn());
const callbacks = vi.hoisted(() => [] as Array<() => void>);
const removeChannelMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock })
}));

vi.mock("@/lib/supabase/browser", () => ({
  createSupabaseBrowserClient: vi.fn(() => {
    const channel = {
      on: vi.fn((_type: string, _filter: unknown, callback: () => void) => {
        callbacks.push(callback);
        return channel;
      }),
      subscribe: vi.fn(() => channel)
    };

    return {
      channel: vi.fn(() => channel),
      removeChannel: removeChannelMock
    };
  })
}));

function RealtimeHarness() {
  useCrmRealtime();
  return null;
}

describe("useCrmRealtime", () => {
  afterEach(() => {
    callbacks.length = 0;
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("debounces realtime refreshes into one router refresh", () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");

    render(<RealtimeHarness />);

    callbacks.forEach((callback) => callback());
    vi.advanceTimersByTime(CRM_REALTIME_REFRESH_DELAY_MS - 1);
    expect(refreshMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
