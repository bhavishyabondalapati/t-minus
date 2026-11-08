import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Fragment_Mono, Onest } from "next/font/google";
import "./globals.css";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const instrument = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const fragment = Fragment_Mono({ weight: "400", subsets: ["latin"], variable: "--font-fragment", display: "swap" });
const onest = Onest({ subsets: ["latin"], variable: "--font-onest", display: "swap" });

export const metadata: Metadata = {
  title: { default: "T-Minus — when to leave for the T", template: "%s · T-Minus" },
  description:
    "A live Boston commute countdown. MBTA arrivals, your walking time and the weather, folded into one number: when to leave.",
  applicationName: "T-Minus",
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2eee3" },
    { media: "(prefers-color-scheme: dark)", color: "#090b0a" },
  ],
  colorScheme: "light dark",
};

// Applies a saved theme before first paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem('tm-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrument.variable} ${fragment.variable} ${onest.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
