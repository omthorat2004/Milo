import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";

import { themeInitScript } from "@milo/ui/theme";

import "./globals.css";

import { Provider } from "./provider";

const bodyFont = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Milo", template: "%s, Milo" },
  description:
    "Know when your resume gets seen. Anonymous analytics for the resume you already host.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf4ea" },
    { media: "(prefers-color-scheme: dark)", color: "#060807" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${bodyFont.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        {/* Runs before hydration to set the theme class — see theme-script.ts */}
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript() }}
        />
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
