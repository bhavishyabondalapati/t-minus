import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { getDb, schema } from "../src/lib/db";

config({ path: ".env.local" });
config();

const DEMO_EMAIL = "demo@t-minus.app";

async function main() {
  const db = getDb();
  // The demo account is only reachable through the "Try the demo" button, so its password is random and thrown away.
  const passwordHash = await hash(randomBytes(24).toString("base64url"), { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, DEMO_EMAIL)).limit(1);
  let userId: number;
  if (existing) {
    userId = existing.id;
    await db.update(schema.users).set({ passwordHash, isDemo: true }).where(eq(schema.users.id, userId));
  } else {
    const [u] = await db.insert(schema.users).values({ email: DEMO_EMAIL, passwordHash, isDemo: true }).returning({ id: schema.users.id });
    userId = u!.id;
  }
  await db.delete(schema.commutes).where(eq(schema.commutes.userId, userId));
  await db.insert(schema.commutes).values([
    {
      userId, name: "Morning to Harvard", routeId: "Red",
      originStopId: "place-pktrm", originStopName: "Park Street",
      destStopId: "place-harsq", destStopName: "Harvard", directionId: 1, walkMinutes: 6,
    },
    {
      userId, name: "Evening home", routeId: "Orange",
      originStopId: "place-dwnxg", originStopName: "Downtown Crossing",
      destStopId: "place-forhl", destStopName: "Forest Hills", directionId: 0, walkMinutes: 4,
    },
  ]);
  console.log("Seeded demo account with 2 commutes.");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
