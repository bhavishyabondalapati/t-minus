import { describe, it, expect } from "vitest";
import {
  computeLeaveBy,
  weatherBufferMinutes,
  formatCountdown,
  categorizeForecast,
  pickLandscapeVariant,
  classifyUrgency,
  type PredictionInput,
} from "@/lib/leave-by";

const NOW = Date.parse("2026-01-15T12:00:00Z");
const at = (mins: number) => new Date(NOW + mins * 60_000).toISOString();
const pred = (id: string, mins: number | null, extra: Partial<PredictionInput> = {}): PredictionInput => ({
  id,
  arrivalTime: mins === null ? null : at(mins),
  departureTime: null,
  ...extra,
});

describe("weatherBufferMinutes", () => {
  it("is 0 for clear, null and undefined", () => {
    expect(weatherBufferMinutes({ category: "clear" })).toBe(0);
    expect(weatherBufferMinutes(null)).toBe(0);
    expect(weatherBufferMinutes(undefined)).toBe(0);
  });
  it("adds minutes for rain, snow and storm", () => {
    expect(weatherBufferMinutes({ category: "rain" })).toBe(2);
    expect(weatherBufferMinutes({ category: "snow" })).toBe(4);
    expect(weatherBufferMinutes({ category: "storm" })).toBe(5);
  });
  it("adds 1 more at >=70% precipitation chance", () => {
    expect(weatherBufferMinutes({ category: "rain", precipProbability: 69 })).toBe(2);
    expect(weatherBufferMinutes({ category: "rain", precipProbability: 70 })).toBe(3);
    expect(weatherBufferMinutes({ category: "snow", precipProbability: 100 })).toBe(5);
  });
  it("ignores bad probabilities and never boosts clear weather", () => {
    expect(weatherBufferMinutes({ category: "rain", precipProbability: Number.NaN })).toBe(2);
    expect(weatherBufferMinutes({ category: "rain", precipProbability: null })).toBe(2);
    expect(weatherBufferMinutes({ category: "clear", precipProbability: 95 })).toBe(0);
  });
});

describe("computeLeaveBy", () => {
  it("subtracts walking time and the 1 minute safety buffer", () => {
    const r = computeLeaveBy({ predictions: [pred("a", 15)], now: NOW, walkMinutes: 6 });
    expect(r.next?.secondsUntilLeave).toBe((15 - 6 - 1) * 60);
    expect(r.bufferMin).toBe(1);
  });
  it("adds the weather buffer", () => {
    const clear = computeLeaveBy({ predictions: [pred("a", 20)], now: NOW, walkMinutes: 5 });
    const snow = computeLeaveBy({
      predictions: [pred("a", 20)],
      now: NOW,
      walkMinutes: 5,
      weather: { category: "snow" },
    });
    expect(clear.next!.secondsUntilLeave - snow.next!.secondsUntilLeave).toBe(4 * 60);
    expect(snow.bufferMin).toBe(5);
  });
  it("accepts a Date or a number for now", () => {
    const a = computeLeaveBy({ predictions: [pred("a", 10)], now: new Date(NOW), walkMinutes: 2 });
    const b = computeLeaveBy({ predictions: [pred("a", 10)], now: NOW, walkMinutes: 2 });
    expect(a.next?.secondsUntilLeave).toBe(b.next?.secondsUntilLeave);
  });
  it("skips trains that already arrived", () => {
    const r = computeLeaveBy({ predictions: [pred("gone", -1), pred("now", 0), pred("ok", 12)], now: NOW, walkMinutes: 3 });
    expect(r.options.map((o) => o.predictionId)).toEqual(["ok"]);
  });
  it("marks a train as missed when you cannot walk it in time, and picks the next catchable one", () => {
    const r = computeLeaveBy({ predictions: [pred("tight", 4), pred("later", 12)], now: NOW, walkMinutes: 5 });
    expect(r.options[0]).toMatchObject({ predictionId: "tight", missed: true, urgency: "missed" });
    expect(r.next?.predictionId).toBe("later");
  });
  it("returns next=null when every train is missed", () => {
    const r = computeLeaveBy({ predictions: [pred("a", 3)], now: NOW, walkMinutes: 10 });
    expect(r.next).toBeNull();
    expect(r.options).toHaveLength(1);
  });
  it("leaves exactly now when leave-by equals now (not missed)", () => {
    const r = computeLeaveBy({ predictions: [pred("a", 6)], now: NOW, walkMinutes: 5 });
    expect(r.next?.secondsUntilLeave).toBe(0);
    expect(r.next?.urgency).toBe("now");
    expect(r.next?.missed).toBe(false);
  });
  it("sorts by boarding time regardless of input order", () => {
    const r = computeLeaveBy({ predictions: [pred("c", 30), pred("a", 10), pred("b", 20)], now: NOW, walkMinutes: 0 });
    expect(r.options.map((o) => o.predictionId)).toEqual(["a", "b", "c"]);
  });
  it("de-duplicates by prediction id", () => {
    const r = computeLeaveBy({ predictions: [pred("a", 10), pred("a", 11)], now: NOW, walkMinutes: 0 });
    expect(r.options).toHaveLength(1);
  });
  it("falls back to departure time when there is no arrival time", () => {
    const r = computeLeaveBy({
      predictions: [{ id: "origin", arrivalTime: null, departureTime: at(14) }],
      now: NOW,
      walkMinutes: 4,
    });
    expect(r.next?.boardAtMs).toBe(NOW + 14 * 60_000);
  });
  it("ignores predictions with no usable time or an invalid time", () => {
    const r = computeLeaveBy({
      predictions: [pred("none", null), { id: "bad", arrivalTime: "not-a-date", departureTime: null }],
      now: NOW,
      walkMinutes: 1,
    });
    expect(r.options).toEqual([]);
    expect(r.next).toBeNull();
  });
  it("ignores cancelled and skipped trips (any case)", () => {
    const r = computeLeaveBy({
      predictions: [
        pred("x", 10, { scheduleRelationship: "CANCELLED" }),
        pred("y", 11, { scheduleRelationship: "skipped" }),
        pred("z", 12, { scheduleRelationship: null }),
      ],
      now: NOW,
      walkMinutes: 1,
    });
    expect(r.options.map((o) => o.predictionId)).toEqual(["z"]);
  });
  it("handles an empty list", () => {
    expect(computeLeaveBy({ predictions: [], now: NOW, walkMinutes: 5 }).next).toBeNull();
  });
  it("treats negative, NaN and infinite walking times as 0", () => {
    for (const w of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = computeLeaveBy({ predictions: [pred("a", 10)], now: NOW, walkMinutes: w });
      expect(r.walkMin).toBe(0);
    }
  });
  it("rounds fractional walking time", () => {
    expect(computeLeaveBy({ predictions: [], now: NOW, walkMinutes: 4.6 }).walkMin).toBe(5);
  });
  it("lets the caller change the safety buffer, and never goes below 0", () => {
    const zero = computeLeaveBy({ predictions: [pred("a", 10)], now: NOW, walkMinutes: 2, safetyBufferMin: 0 });
    const neg = computeLeaveBy({ predictions: [pred("a", 10)], now: NOW, walkMinutes: 2, safetyBufferMin: -9 });
    expect(zero.next?.secondsUntilLeave).toBe(8 * 60);
    expect(neg.next?.secondsUntilLeave).toBe(8 * 60);
  });
  it("is DST-safe because it works in epoch milliseconds", () => {
    // 2026-03-08 06:55Z -> US clocks spring forward at 07:00Z
    const now = Date.parse("2026-03-08T06:55:00Z");
    const board = new Date(now + 30 * 60_000).toISOString();
    const r = computeLeaveBy({ predictions: [{ id: "d", arrivalTime: board, departureTime: null }], now, walkMinutes: 5 });
    expect(r.next?.secondsUntilLeave).toBe((30 - 5 - 1) * 60);
  });
  it("floors partial seconds", () => {
    const r = computeLeaveBy({
      predictions: [{ id: "a", arrivalTime: new Date(NOW + 10 * 60_000 + 900).toISOString(), departureTime: null }],
      now: NOW,
      walkMinutes: 0,
      safetyBufferMin: 0,
    });
    expect(r.next?.secondsUntilLeave).toBe(600);
  });
});

describe("classifyUrgency", () => {
  it("buckets seconds", () => {
    expect(classifyUrgency(-1)).toBe("missed");
    expect(classifyUrgency(0)).toBe("now");
    expect(classifyUrgency(59)).toBe("now");
    expect(classifyUrgency(60)).toBe("soon");
    expect(classifyUrgency(299)).toBe("soon");
    expect(classifyUrgency(300)).toBe("calm");
  });
});

describe("formatCountdown", () => {
  it("formats mm:ss", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(59.9)).toBe("00:59");
  });
  it("formats hours and clamps negatives", () => {
    expect(formatCountdown(3725)).toBe("1:02:05");
    expect(formatCountdown(-30)).toBe("00:00");
  });
});

describe("categorizeForecast", () => {
  it.each([
    ["Sunny", "clear"],
    ["Mostly Cloudy", "clear"],
    ["Light Rain Likely", "rain"],
    ["Chance Showers And Thunderstorms", "storm"],
    ["Snow Showers", "snow"],
    ["Freezing Rain", "snow"],
    ["Patchy Drizzle", "rain"],
    ["", "clear"],
    [null, "clear"],
  ])("%s -> %s", (text, expected) => {
    expect(categorizeForecast(text as string | null)).toBe(expected);
  });
});

describe("pickLandscapeVariant", () => {
  it("lets precipitation override time of day", () => {
    expect(pickLandscapeVariant("storm", 12)).toBe("storm");
    expect(pickLandscapeVariant("snow", 2)).toBe("snow");
    expect(pickLandscapeVariant("rain", 18)).toBe("rain");
  });
  it.each([
    [5, "sunrise"], [8, "sunrise"], [9, "noon"], [15, "noon"],
    [16, "sunset"], [19, "sunset"], [20, "night"], [23, "night"], [0, "night"], [4, "night"],
  ])("clear at hour %i -> %s", (h, v) => {
    expect(pickLandscapeVariant("clear", h)).toBe(v);
  });
  it("uses the forecast's isDaytime flag to pick night at dusk, but not to override weather", () => {
    expect(pickLandscapeVariant("clear", 17, false)).toBe("night");
    expect(pickLandscapeVariant("clear", 17, true)).toBe("sunset");
    expect(pickLandscapeVariant("clear", 17, null)).toBe("sunset");
    expect(pickLandscapeVariant("rain", 22, false)).toBe("rain");
  });
  it("wraps out-of-range hours", () => {
    expect(pickLandscapeVariant("clear", 25)).toBe("night");
    expect(pickLandscapeVariant("clear", -1)).toBe("night");
  });
});
