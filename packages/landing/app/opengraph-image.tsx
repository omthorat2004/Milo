import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name}, ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card LinkedIn, X and Slack render when the link is shared.
 *
 * Generated at build time so it always matches the current tagline, and kept in
 * the same palette as the site: ink ground, sand type, one green signal.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#060807",
        backgroundImage:
          "radial-gradient(60% 55% at 25% 15%, rgba(192,141,99,0.22), transparent 65%), radial-gradient(45% 45% at 85% 90%, rgba(63,207,142,0.20), transparent 65%)",
        padding: "72px 80px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <svg width="46" height="46" viewBox="0 0 64 64">
          <path
            d="M18 12h18l10 10v30H18z"
            fill="none"
            stroke="#EDE1D1"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M36 12v10h10"
            fill="none"
            stroke="#EDE1D1"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="37" r="5" fill="#3FCF8E" />
        </svg>
        <span style={{ color: "#EDE1D1", fontSize: 38, letterSpacing: -0.5 }}>Milo</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            color: "#FAF4EA",
            fontSize: 76,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          Know when your resume gets seen.
        </span>
        <span style={{ color: "#9C8A73", fontSize: 30, marginTop: 28, maxWidth: 820 }}>
          Views, downloads and per-page attention for the resume you already host. Anonymous
          analytics, never who.
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 10,
            background: "#3FCF8E",
            display: "flex",
          }}
        />
        <span style={{ color: "#6B5F50", fontSize: 24, letterSpacing: 2 }}>
          PRIVATE BETA · JOIN THE WAITLIST
        </span>
      </div>
    </div>,
    size,
  );
}
