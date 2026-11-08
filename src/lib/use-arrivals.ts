"use client";
import { useEffect, useState } from "react";
import type { WeatherCategory } from "@/lib/leave-by";

export interface ArrivalPrediction {
  id: string;
  arrivalTime: string | null;
  departureTime: string | null;
  scheduledArrival: string | null;
  scheduleRelationship: string | null;
}
export interface ArrivalWeather {
  available: boolean;
  category: WeatherCategory;
  precipProbability: number | null;
  shortForecast: string;
  tempF: number | null;
}
export type ArrivalStatus = "connecting" | "live" | "degraded";

export interface ArrivalState {
  status: ArrivalStatus;
  predictions: ArrivalPrediction[];
  weather: ArrivalWeather | null;
  stale: boolean;
  updatedAt: number | null;
}

const INITIAL: ArrivalState = { status: "connecting", predictions: [], weather: null, stale: false, updatedAt: null };

/** Subscribes to the server-sent events stream for one stop/line/direction. */
export function useArrivals(stop: string | null, route: string | null, direction: number | null, enabled = true): ArrivalState {
  const [state, setState] = useState<ArrivalState>(INITIAL);

  useEffect(() => {
    if (!enabled || !stop || !route || direction === null) return;
    const qs = new URLSearchParams({ stop, route, direction: String(direction) });
    const es = new EventSource(`/api/arrivals/stream?${qs}`);
    es.addEventListener("arrivals", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setState({ status: "live", predictions: d.predictions, weather: d.weather, stale: !!d.stale, updatedAt: d.serverTime });
    });
    es.addEventListener("degraded", () => setState((s) => ({ ...s, status: "degraded" })));
    es.onerror = () => setState((s) => ({ ...s, status: s.updatedAt ? "degraded" : "connecting" }));
    return () => es.close();
  }, [stop, route, direction, enabled]);

  return state;
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function fmtClock(ms: number): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(ms);
}
