/**
 * Leave-by engine (pure, no I/O).
 *
 * leave-by time = boarding time - walking time - weather buffer - safety buffer
 */

export type WeatherCategory = "clear" | "rain" | "snow" | "storm";

export interface WeatherInput {
  category: WeatherCategory;
  /** 0-100, chance of precipitation. Optional. */
  precipProbability?: number | null;
}

export interface PredictionInput {
  id: string;
  arrivalTime: string | null;
  departureTime: string | null;
  scheduleRelationship?: string | null;
}

export type Urgency = "calm" | "soon" | "now" | "missed";

export interface LeaveOption {
  predictionId: string;
  boardAtMs: number;
  leaveByMs: number;
  /** Seconds until you must leave. Negative once the leave-by time has passed. */
  secondsUntilLeave: number;
  /** Train is still ahead but you cannot walk it in time without running. */
  missed: boolean;
  urgency: Urgency;
}

export interface LeaveByResult {
  bufferMin: number;
  walkMin: number;
  options: LeaveOption[];
  next: LeaveOption | null;
}

export const SAFETY_BUFFER_MIN = 1;

const BASE_WEATHER_BUFFER: Record<WeatherCategory, number> = {
  clear: 0,
  rain: 2,
  snow: 4,
  storm: 5,
};

/** Extra minutes to allow for the weather. */
export function weatherBufferMinutes(weather: WeatherInput | null | undefined): number {
  if (!weather) return 0;
  const base = BASE_WEATHER_BUFFER[weather.category] ?? 0;
  if (weather.category === "clear") return base;
  const p = weather.precipProbability;
  const heavy = typeof p === "number" && Number.isFinite(p) && p >= 70;
  return base + (heavy ? 1 : 0);
}

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function cleanWalk(m: number): number {
  if (!Number.isFinite(m) || m < 0) return 0;
  return Math.round(m);
}

export function classifyUrgency(secondsUntilLeave: number): Urgency {
  if (secondsUntilLeave < 0) return "missed";
  if (secondsUntilLeave < 60) return "now";
  if (secondsUntilLeave < 5 * 60) return "soon";
  return "calm";
}

export interface ComputeArgs {
  predictions: PredictionInput[];
  now: Date | number;
  walkMinutes: number;
  weather?: WeatherInput | null;
  safetyBufferMin?: number;
}

export function computeLeaveBy(args: ComputeArgs): LeaveByResult {
  const nowMs = typeof args.now === "number" ? args.now : args.now.getTime();
  const walkMin = cleanWalk(args.walkMinutes);
  const weatherMin = weatherBufferMinutes(args.weather);
  const safety = args.safetyBufferMin ?? SAFETY_BUFFER_MIN;
  const bufferMin = weatherMin + Math.max(0, safety);
  const offsetMs = (walkMin + bufferMin) * 60_000;

  const seen = new Set<string>();
  const options: LeaveOption[] = [];

  for (const p of args.predictions) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const rel = (p.scheduleRelationship ?? "").toUpperCase();
    if (rel === "CANCELLED" || rel === "SKIPPED") continue;

    const boardAtMs = parseMs(p.arrivalTime) ?? parseMs(p.departureTime);
    if (boardAtMs === null || boardAtMs <= nowMs) continue; // already gone

    const leaveByMs = boardAtMs - offsetMs;
    const secondsUntilLeave = Math.floor((leaveByMs - nowMs) / 1000);
    const missed = secondsUntilLeave < 0;
    options.push({
      predictionId: p.id,
      boardAtMs,
      leaveByMs,
      secondsUntilLeave,
      missed,
      urgency: classifyUrgency(secondsUntilLeave),
    });
  }

  options.sort((a, b) => a.boardAtMs - b.boardAtMs);
  const next = options.find((o) => !o.missed) ?? null;
  return { bufferMin, walkMin, options, next };
}

/** mm:ss, or h:mm:ss over an hour. Negative values show as 00:00. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Map NWS forecast text to our weather category. */
export function categorizeForecast(shortForecast: string | null | undefined): WeatherCategory {
  const t = (shortForecast ?? "").toLowerCase();
  if (/thunder|t-storm|tstorm|severe|hail|tornado/.test(t)) return "storm";
  if (/snow|sleet|flurr|blizzard|freezing|wintry|ice/.test(t)) return "snow";
  if (/rain|shower|drizzle/.test(t)) return "rain";
  return "clear";
}

export type LandscapeVariant = "sunrise" | "noon" | "sunset" | "night" | "rain" | "snow" | "storm";

/**
 * Choose a Landscape variant from weather + local time.
 * Precipitation wins; otherwise the time of day decides.
 */
export function pickLandscapeVariant(category: WeatherCategory, localHour: number, isDaytime?: boolean | null): LandscapeVariant {
  if (category === "storm") return "storm";
  if (category === "snow") return "snow";
  if (category === "rain") return "rain";
  // The forecast knows real sunset (it moves through the year), so trust it over the clock at dusk.
  if (isDaytime === false) return "night";
  const h = ((Math.floor(localHour) % 24) + 24) % 24;
  if (h >= 5 && h < 9) return "sunrise";
  if (h >= 9 && h < 16) return "noon";
  if (h >= 16 && h < 20) return "sunset";
  return "night";
}
