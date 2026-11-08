import "server-only";
import { cached } from "./cache";
import { categorizeForecast, pickLandscapeVariant, type LandscapeVariant, type WeatherCategory } from "@/lib/leave-by";

const UA = "T-Minus commute app (https://github.com/bhavishyabondalapati/t-minus)";
// Downtown Boston
const LAT = 42.3601;
const LON = -71.0589;

async function nws(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, accept: "application/geo+json" },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`NWS ${res.status}`);
  return res.json();
}

export interface Weather {
  available: boolean;
  category: WeatherCategory;
  shortForecast: string;
  tempF: number | null;
  precipProbability: number | null;
  variant: LandscapeVariant;
  stale: boolean;
}

export function bostonHour(d = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }).format(d);
  return Number(h) % 24;
}

export async function getWeather(): Promise<Weather> {
  try {
    const points = await cached("nws:points:v1", 24 * 3600, () => nws(`https://api.weather.gov/points/${LAT},${LON}`));
    const hourlyUrl: string = points.data.properties.forecastHourly;
    const hourly = await cached("nws:hourly:v1", 10 * 60, () => nws(hourlyUrl));
    const p = hourly.data.properties.periods?.[0];
    const shortForecast = String(p?.shortForecast ?? "");
    const category = categorizeForecast(shortForecast);
    return {
      available: true,
      category,
      shortForecast,
      tempF: typeof p?.temperature === "number" ? p.temperature : null,
      precipProbability: p?.probabilityOfPrecipitation?.value ?? null,
      variant: pickLandscapeVariant(category, bostonHour()),
      stale: hourly.stale,
    };
  } catch {
    // Degrade: assume clear weather, but still pick a variant from local time.
    return {
      available: false,
      category: "clear",
      shortForecast: "Weather unavailable",
      tempF: null,
      precipProbability: null,
      variant: pickLandscapeVariant("clear", bostonHour()),
      stale: true,
    };
  }
}
