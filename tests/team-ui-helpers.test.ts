import { describe, expect, it } from "vitest";
import { assessPassword } from "@/components/team/password-strength";
import { formatWhen, summarizeDetails } from "@/components/team/format";
import { isCurrent } from "@/components/team/nav-links";

describe("assessPassword", () => {
  it("flags a short password and says how many more characters", () => {
    const s = assessPassword("abc");
    expect(s.level).toBe(0);
    expect(s.hints[0]).toContain("9 more");
  });
  it("asks for input when empty", () => {
    expect(assessPassword("").label).toBe("Enter a password");
  });
  it("calls repeated or sequential passwords weak even when long enough", () => {
    expect(assessPassword("aaaaaaaaaaaaaaaa").level).toBe(1);
    expect(assessPassword("qwertyuiop1234").level).toBe(1);
  });
  it("warns about passwords containing the person's name or email", () => {
    const s = assessPassword("ananyasharma-2026!", ["Ananya Sharma", "ananya"]);
    expect(s.level).toBe(1);
    expect(s.hints.join(" ")).toContain("name or email");
  });
  it("rates a long passphrase as strong", () => {
    expect(assessPassword("correct horse battery staple").level).toBe(3);
  });
});

describe("formatting", () => {
  it("formats times in UTC and handles missing and invalid values", () => {
    expect(formatWhen("2026-11-17T12:48:33.000Z")).toBe("2026-11-17 12:48 UTC");
    expect(formatWhen(null)).toBe("Never");
    expect(formatWhen("garbage")).toBe("garbage");
  });
  it("summarises audit details and leaves out anything secret-looking", () => {
    const out = summarizeDetails({ role: "lawyer", country: "IN", token: "abc", password_hash: "x", empty: "", note: null });
    expect(out).toBe("role: lawyer, country: IN");
    expect(summarizeDetails({ big: "y".repeat(500) }, 40)).toHaveLength(40);
    expect(summarizeDetails(null)).toBe("");
  });
});

describe("nav highlighting", () => {
  const team = { href: "/team", label: "Team", match: "/team", except: ["/team/applications", "/team/audit"] };
  const apps = { href: "/team/applications", label: "Applications", match: "/team/applications" };
  it("marks the right section as current", () => {
    expect(isCurrent("/team", team)).toBe(true);
    expect(isCurrent("/team/members/abc", team)).toBe(true);
    expect(isCurrent("/team/applications", team)).toBe(false);
    expect(isCurrent("/team/applications", apps)).toBe(true);
    expect(isCurrent("/teamwork", team)).toBe(false);
  });
});
