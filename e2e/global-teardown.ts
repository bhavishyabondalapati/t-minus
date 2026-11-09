import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { assertSafeEnv } from "./guard";

/** Remove the throwaway users the suite created. Re-checks the target first. */
export default async function teardown() {
  config({ path: ".env.local" });
  const url = assertSafeEnv(process.env);
  await neon(url)`delete from users where email like 'e2e-%@example.test'`;
}
