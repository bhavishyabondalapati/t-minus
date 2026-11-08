import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/server/auth";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  await getDb().delete(schema.commutes).where(and(eq(schema.commutes.id, id), eq(schema.commutes.userId, user.id)));
  return Response.json({ ok: true });
}
