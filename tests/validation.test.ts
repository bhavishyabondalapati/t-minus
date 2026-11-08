import { describe, it, expect } from "vitest";
import { credentialsSchema, commuteInputSchema, streamQuerySchema, loginSchema } from "@/lib/validation";
import { summarize } from "@/components/panels/OnTimeGauge";

describe("credentialsSchema", () => {
  it("lower-cases and trims the email", () => {
    const r = credentialsSchema.parse({ email: "  Me@Example.COM ", password: "correct horse" });
    expect(r.email).toBe("me@example.com");
  });
  it("rejects short passwords and bad emails", () => {
    expect(credentialsSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "nope", password: "long enough pw" }).success).toBe(false);
  });
  it("caps the password length", () => {
    expect(credentialsSchema.safeParse({ email: "a@b.co", password: "x".repeat(129) }).success).toBe(false);
  });
  it("login accepts any non-empty password (so old passwords still work)", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("commuteInputSchema", () => {
  const ok = { name: "Work", routeId: "Red", originStopId: "place-pktrm", destStopId: "place-harsq", walkMinutes: "6" };
  it("coerces walkMinutes from a string", () => {
    expect(commuteInputSchema.parse(ok).walkMinutes).toBe(6);
  });
  it.each([[-1], [61], [2.5], ["abc"]])("rejects walkMinutes=%s", (w) => {
    expect(commuteInputSchema.safeParse({ ...ok, walkMinutes: w }).success).toBe(false);
  });
  it("rejects ids with unsafe characters", () => {
    expect(commuteInputSchema.safeParse({ ...ok, originStopId: "x; drop table" }).success).toBe(false);
    expect(commuteInputSchema.safeParse({ ...ok, routeId: "../etc" }).success).toBe(false);
  });
  it("requires a name", () => {
    expect(commuteInputSchema.safeParse({ ...ok, name: "   " }).success).toBe(false);
  });
});

describe("streamQuerySchema", () => {
  it("accepts direction 0 and 1 only", () => {
    expect(streamQuerySchema.safeParse({ stop: "place-pktrm", route: "Red", direction: "1" }).success).toBe(true);
    expect(streamQuerySchema.safeParse({ stop: "place-pktrm", route: "Red", direction: "2" }).success).toBe(false);
  });
});

describe("summarize on-time stats", () => {
  const rows = [
    { routeId: "Red", hour: 8, avgDelaySec: 60, onTimePct: 90, samples: 10 },
    { routeId: "Red", hour: 9, avgDelaySec: 180, onTimePct: 70, samples: 30 },
    { routeId: "Blue", hour: 8, avgDelaySec: 0, onTimePct: 100, samples: 5 },
  ];
  it("weights by sample count", () => {
    const s = summarize(rows, "Red")!;
    expect(s.n).toBe(40);
    expect(s.pct).toBeCloseTo(75);
    expect(s.avg).toBeCloseTo(150);
  });
  it("returns null with no data", () => {
    expect(summarize(rows, "Orange")).toBeNull();
    expect(summarize([], "Red")).toBeNull();
  });
});
