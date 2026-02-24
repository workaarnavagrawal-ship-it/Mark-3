import "./globals.css";
import { EB_Garamond, DM_Sans } from "next/font/google";
import type { Metadata } from "next";

const garamond = EB_Garamond({ subsets: ["latin"], variable: "--font-garamond", display: "swap", weight: ["400","500","600"], style: ["normal","italic"] });
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap", weight: ["300","400","500"] });

export const metadata: Metadata = {
  title: "offr — know your chances",
  description: "Data-driven UCAS offer predictions for IB and A-Level students.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${dm.variable}`}>
      <body style={{ fontFamily: "var(--font-dm, var(--sans))" }}>{children}</body>
    </html>
  );
}
