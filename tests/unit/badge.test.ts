import { describe, expect, it } from "vitest";
import { bandTone } from "@/components/ui/badge";

describe("bandTone", () => {
  it("maps lead bands to CRM badge tones", () => {
    expect(bandTone("A")).toBe("band-a");
    expect(bandTone("B")).toBe("band-b");
    expect(bandTone("C")).toBe("band-c");
    expect(bandTone("D")).toBe("band-d");
    expect(bandTone(null)).toBe("muted");
  });
});
