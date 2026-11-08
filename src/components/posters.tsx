import type { LandscapeVariant } from "@/lib/leave-by";

const SKY: Record<LandscapeVariant, [string, string, string]> = {
  sunrise: ["#1c2a4d", "#d9705a", "#f7c780"],
  noon: ["#4d9de0", "#8ec5f2", "#dcefff"],
  sunset: ["#241c4a", "#cf4f6a", "#ffb067"],
  night: ["#03050d", "#0b1433", "#18254f"],
  rain: ["#2f3846", "#566272", "#8793a1"],
  snow: ["#9aa6b3", "#c8d0d9", "#eef1f4"],
  storm: ["#12151f", "#2c3446", "#4a566e"],
};
const GROUND: Record<LandscapeVariant, [string, string, string]> = {
  sunrise: ["#3b2d4a", "#2a2238", "#1a1526"],
  noon: ["#5e8f5a", "#46774a", "#2f5a3a"],
  sunset: ["#3b2447", "#27183a", "#150e24"],
  night: ["#0d1226", "#080b1a", "#04060f"],
  rain: ["#3c4a45", "#2d3a37", "#1f2927"],
  snow: ["#f4f6f8", "#e2e7ec", "#cfd6dd"],
  storm: ["#262d36", "#1b2128", "#10141a"],
};

export const LANDSCAPE_ALT: Record<LandscapeVariant, string> = {
  sunrise: "Illustrated hills at sunrise with a warm orange sky",
  noon: "Illustrated hills under a bright blue midday sky",
  sunset: "Illustrated hills at sunset with a pink and gold sky",
  night: "Illustrated hills under a dark starry night sky",
  rain: "Illustrated hills under grey rain clouds",
  snow: "Illustrated snowy hills under a pale winter sky",
  storm: "Illustrated hills under a dark thunderstorm sky",
};

/** Static fallback for the Landscape scene. Pure SVG, no JS. */
export function LandscapePoster({ variant }: { variant: LandscapeVariant }) {
  const [a, b, c] = SKY[variant];
  const [g1, g2, g3] = GROUND[variant];
  const gid = `sky-${variant}`;
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.6" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${gid})`} />
      {variant === "night" &&
        Array.from({ length: 60 }, (_, i) => (
          <circle key={i} cx={(i * 263) % 1600} cy={(i * 97) % 480} r={(i % 3) + 0.8} fill="#dfe6ff" opacity={0.35 + (i % 5) * 0.12} />
        ))}
      {(variant === "sunrise" || variant === "sunset") && <circle cx={variant === "sunrise" ? 420 : 1180} cy="560" r="96" fill="#fff1c9" opacity="0.9" />}
      {variant === "noon" && <circle cx="1240" cy="170" r="70" fill="#fffbe0" opacity="0.95" />}
      {(variant === "rain" || variant === "storm") &&
        Array.from({ length: 90 }, (_, i) => (
          <line key={i} x1={(i * 181) % 1600} y1={(i * 71) % 700} x2={((i * 181) % 1600) - 14} y2={((i * 71) % 700) + 46} stroke="#c8d6e6" strokeOpacity="0.35" strokeWidth="2" />
        ))}
      {variant === "storm" && <path d="M900 120 L840 300 L900 300 L850 470 L980 260 L915 260 Z" fill="#f4f1c4" opacity="0.85" />}
      {variant === "snow" &&
        Array.from({ length: 70 }, (_, i) => <circle key={i} cx={(i * 233) % 1600} cy={(i * 131) % 760} r={(i % 3) + 2} fill="#fff" opacity="0.85" />)}
      {/* far skyline */}
      <path d="M0 640 h110 v-70 h40 v-40 h30 v110 h80 v-150 h26 v150 h90 v-90 h50 v90 h120 v-60 h40 v60 h140 v-110 h30 v110 h100 v-70 h60 v70 h200 v-130 h24 v130 h120 v-80 h50 v80 h160 V900 H0 Z" fill={g1} opacity="0.55" />
      <path d="M0 700 C220 610 380 640 560 690 S980 650 1180 680 S1500 640 1600 690 V900 H0 Z" fill={g1} />
      <path d="M0 770 C260 700 420 740 640 770 S1040 720 1260 760 S1520 730 1600 770 V900 H0 Z" fill={g2} />
      <path d="M0 840 C300 790 520 830 800 845 S1280 800 1600 840 V900 H0 Z" fill={g3} />
    </svg>
  );
}

/** Generic CRT / instrument panel fallback. */
export function PanelPoster({ tone = "amber" }: { tone?: "amber" | "ink" }) {
  const c = tone === "amber" ? "255,176,32" : "160,170,160";
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(120% 90% at 50% 0%, rgba(${c},0.14), transparent 60%), repeating-linear-gradient(0deg, rgba(${c},0.05) 0 1px, transparent 1px 4px), #050806`,
      }}
    />
  );
}
