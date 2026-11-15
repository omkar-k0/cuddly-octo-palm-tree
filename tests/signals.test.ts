import { describe, expect, it } from "vitest";
import { deadlineDaysFromText, looksCriminal } from "@/lib/pipeline/signals";

describe("deadlineDaysFromText", () => {
  it.each([
    ["I have to reply by tomorrow", 1],
    ["the notice says I must vacate within 3 days", 3],
    ["hearing is next week", 7],
    ["only two days left to respond", 2],
    ["I must reply today", 0],
  ])("%s → %d", (s, d) => expect(deadlineDaysFromText(s)).toBe(d));

  it.each([
    "my salary was due 3 days ago",
    "gratuity is 15 days' wages per year",
    "I worked there for 6 years",
    "Is gratuity payable after resignation?",
  ])("no deadline: %s", (s) => expect(deadlineDaysFromText(s)).toBeNull());
});

describe("looksCriminal", () => {
  it("flags police and criminal terms", () => {
    expect(looksCriminal("my employer filed an FIR against me")).toBe(true);
    expect(looksCriminal("the cheque bounced and he sent a notice")).toBe(true);
  });
  it("flags harassment with contact, hacking and self-help eviction", () => {
    expect(looksCriminal("my manager touched me at the office party")).toBe(true);
    expect(looksCriminal("my Instagram account got hacked")).toBe(true);
    expect(looksCriminal("the landlord changed the locks while I was away")).toBe(true);
  });
  it("does not flag a plain wage question", () => {
    expect(looksCriminal("my salary has not been paid for two months")).toBe(false);
    expect(looksCriminal("HR asked me to get in touch with them about my notice period")).toBe(false);
  });
});
