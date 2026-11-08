import "server-only";
import { cached, type Cached } from "./cache";

const BASE = "https://api-v3.mbta.com";

async function mbtaGet(path: string, params: Record<string, string>): Promise<MbtaDoc> {
  const key = process.env.MBTA_API_KEY;
  if (!key) throw new Error("MBTA_API_KEY is not set");
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { "x-api-key": key, accept: "application/vnd.api+json" },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`MBTA ${res.status} for ${path}`);
  return (await res.json()) as MbtaDoc;
}

interface MbtaResource {
  id: string;
  type: string;
  attributes: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  relationships?: Record<string, { data: { id: string; type: string } | null }>;
}
interface MbtaDoc {
  data: MbtaResource[];
  included?: MbtaResource[];
}

export interface Line {
  id: string;
  name: string;
  color: string;
  directionNames: string[];
  directionDestinations: string[];
}
export interface Stop {
  id: string;
  name: string;
}
export interface Prediction {
  id: string;
  tripId: string | null;
  routeId: string;
  stopId: string;
  directionId: number;
  arrivalTime: string | null;
  departureTime: string | null;
  scheduledArrival: string | null;
  scheduleRelationship: string | null;
  status: string | null;
  vehicleStatus: string | null;
  vehicleStopId: string | null;
  vehicleUpdatedAt: string | null;
}
export interface Alert {
  id: string;
  header: string;
  effect: string;
  severity: number;
  lifecycle: string;
}

export function getLines(): Promise<Cached<Line[]>> {
  return cached("mbta:lines:v1", 24 * 3600, async () => {
    const doc = await mbtaGet("/routes", { "filter[type]": "0,1" });
    return doc.data.map((r) => ({
      id: r.id,
      name: String(r.attributes.long_name ?? r.id),
      color: `#${r.attributes.color ?? "888888"}`,
      directionNames: r.attributes.direction_names ?? [],
      directionDestinations: r.attributes.direction_destinations ?? [],
    }));
  });
}

/** Parent stations in route order for one direction. */
export function getStops(routeId: string, directionId: number): Promise<Cached<Stop[]>> {
  return cached(`mbta:stops:v1:${routeId}:${directionId}`, 24 * 3600, async () => {
    const doc = await mbtaGet("/stops", {
      "filter[route]": routeId,
      "filter[direction_id]": String(directionId),
      "filter[location_type]": "1",
    });
    return doc.data.map((s) => ({ id: s.id, name: String(s.attributes.name) }));
  });
}

function normalizePredictions(doc: MbtaDoc): Prediction[] {
  const inc = new Map((doc.included ?? []).map((i) => [`${i.type}:${i.id}`, i]));
  return doc.data.map((p) => {
    const rel = p.relationships ?? {};
    const sched = rel.schedule?.data ? inc.get(`schedule:${rel.schedule.data.id}`) : undefined;
    const veh = rel.vehicle?.data ? inc.get(`vehicle:${rel.vehicle.data.id}`) : undefined;
    return {
      id: p.id,
      tripId: rel.trip?.data?.id ?? null,
      routeId: rel.route?.data?.id ?? "",
      stopId: rel.stop?.data?.id ?? "",
      directionId: Number(p.attributes.direction_id ?? 0),
      arrivalTime: p.attributes.arrival_time ?? null,
      departureTime: p.attributes.departure_time ?? null,
      scheduledArrival: sched?.attributes.arrival_time ?? sched?.attributes.departure_time ?? null,
      scheduleRelationship: p.attributes.schedule_relationship ?? null,
      status: p.attributes.status ?? null,
      vehicleStatus: veh?.attributes.current_status ?? null,
      vehicleStopId: veh?.relationships?.stop?.data?.id ?? null,
      vehicleUpdatedAt: veh?.attributes.updated_at ?? null,
    };
  });
}

export function getPredictions(stopId: string, routeId: string, directionId: number): Promise<Cached<Prediction[]>> {
  return cached(`mbta:pred:v1:${stopId}:${routeId}:${directionId}`, 10, async () => {
    const doc = await mbtaGet("/predictions", {
      "filter[stop]": stopId,
      "filter[route]": routeId,
      "filter[direction_id]": String(directionId),
      sort: "arrival_time",
      include: "schedule,vehicle",
      "page[limit]": "8",
    });
    return normalizePredictions(doc);
  });
}

export function getAlerts(routeId: string): Promise<Cached<Alert[]>> {
  return cached(`mbta:alerts:v1:${routeId}`, 60, async () => {
    const doc = await mbtaGet("/alerts", {
      "filter[route]": routeId,
      "filter[datetime]": "NOW",
      "filter[lifecycle]": "NEW,ONGOING",
      sort: "-severity",
      "page[limit]": "6",
    });
    return doc.data.map((a) => ({
      id: a.id,
      header: String(a.attributes.header ?? ""),
      effect: String(a.attributes.effect ?? ""),
      severity: Number(a.attributes.severity ?? 0),
      lifecycle: String(a.attributes.lifecycle ?? ""),
    }));
  });
}
