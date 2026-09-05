import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FootyScores Endpoint Builder",
  description: "Paris 2024 football API endpoint reference tool for QA engineers.",
  authors: [{ name: "FootyScores" }],
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "FootyScores Endpoint Builder",
    description: "Generate and review Paris 2024 football API endpoint references.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
