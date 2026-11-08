import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import Dashboard from "@/components/Dashboard";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "My commutes" };

export default async function AppPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const db = getDb();
  const [commutes, stats] = await Promise.all([
    db.select().from(schema.commutes).where(eq(schema.commutes.userId, user.id)).orderBy(desc(schema.commutes.id)),
    db.select().from(schema.delayStats),
  ]);
  return (
    <Dashboard
      email={user.email}
      isDemo={user.isDemo}
      initial={commutes.map((c) => ({ id: c.id, name: c.name, routeId: c.routeId, originStopId: c.originStopId, originStopName: c.originStopName, destStopId: c.destStopId, destStopName: c.destStopName, directionId: c.directionId, walkMinutes: c.walkMinutes }))}
      stats={stats.map((r) => ({ routeId: r.routeId, hour: r.hour, avgDelaySec: r.avgDelaySec, onTimePct: r.onTimePct, samples: r.samples }))}
    />
  );
}
