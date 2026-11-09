/** The shared demo account can look but not touch: every write is refused on the server. */
export const DEMO_READONLY_MESSAGE = "The demo account is read-only. Create a free account to save your own commutes.";

export function demoWriteBlock(user: { isDemo: boolean }): Response | null {
  if (!user.isDemo) return null;
  return Response.json({ error: DEMO_READONLY_MESSAGE, code: "demo_readonly" }, { status: 403 });
}
