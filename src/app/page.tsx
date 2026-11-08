import Link from "next/link";
import Hero from "@/components/Hero";
import LiveDemo from "@/components/LiveDemo";
import SignupCta from "@/components/SignupCta";
import { getWeather } from "@/lib/server/nws";

export const revalidate = 300;

const STEPS = [
  ["01", "Save a commute", "Pick a line, where you board, where you get off, and how many minutes it takes you to walk to the platform."],
  ["02", "We watch the trains", "Predictions stream in every ten seconds. Rain or snow adds a few minutes of buffer, because wet sidewalks are slower."],
  ["03", "Count down", "One timer: the moment you must walk out the door to make the train. Not the train time. Yours."],
];

export default async function Home() {
  const w = await getWeather();
  return (
    <>
      <Hero variant={w.variant} tempF={w.tempF} forecast={w.shortForecast} />

      <section className="wrap section" aria-labelledby="live-h">
        <p className="label">01 — The board</p>
        <h2 id="live-h" className="display section-title">Right now at Park Street</h2>
        <p className="note" style={{ maxWidth: "58ch", marginBottom: 28 }}>
          This is the real feed. Change how far you are from the station and the leave-by time moves with it.
        </p>
        <LiveDemo />
      </section>

      <section id="how" className="wrap section" aria-labelledby="how-h">
        <p className="label">02 — Method</p>
        <h2 id="how-h" className="display section-title">Three steps, one number</h2>
        <ol className="steps">
          {STEPS.map(([n, h, p]) => (
            <li key={n}>
              <span className="num steps-n">{n}</span>
              <h3 className="display" style={{ fontSize: "1.9rem" }}>{h}</h3>
              <p className="note">{p}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap section" aria-labelledby="rel-h">
        <p className="label">03 — Honesty</p>
        <h2 id="rel-h" className="display section-title">We keep score on the T</h2>
        <p className="note" style={{ maxWidth: "62ch", marginBottom: 20 }}>
          Every prediction we show is logged and checked against when the train really arrived. The reliability page shows the average delay by line and hour of day, so you know which trains to trust.
        </p>
        <Link href="/reliability" className="btn">See the numbers</Link>
      </section>

      <section className="wrap section cta-band" aria-labelledby="cta-h">
        <h2 id="cta-h" className="display" style={{ fontSize: "clamp(2.4rem, 6vw, 4.4rem)" }}>Stop standing on the platform.</h2>
        <SignupCta />
      </section>
    </>
  );
}
