import "./globals.css";
import { EB_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";

const garamond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "offr — everything you need to get an offer",
  description: "UCAS decision-support for IB and A-Level applicants. Course clarity, offer chances, PS analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${dm.variable} ${jetbrains.variable}`}>
      <body style={{ fontFamily: "var(--font-dm, var(--sans))" }}>
        {children}
      </body>
    </html>
  );
}
