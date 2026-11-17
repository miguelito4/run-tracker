import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Run Tracker",
  description: "A training journal for runs. Garmin data plus how it felt.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Runs",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

// Applies the saved accent before first paint so there's no color flash.
const accentBoot = `
try {
  var A = {volt:["#8CFF3A","#2F7A00"],pink:["#FF2D87","#C8005A"],cyan:["#22E4FF","#00708A"],yellow:["#FFEA00","#7A6A00"],violet:["#C04DFF","#8A00D4"],orange:["#FF6A00","#C24E00"]};
  var a = A[localStorage.getItem("run-tracker-accent")];
  if (a) { var s = document.documentElement.style; s.setProperty("--accent", a[0]); s.setProperty("--accent-ink", a[1]); }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: accentBoot }} />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js')); }`,
          }}
        />
      </body>
    </html>
  );
}
