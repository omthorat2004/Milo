import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon. Same mark as icon.svg, sized for iOS. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#060807",
      }}
    >
      <svg width="120" height="120" viewBox="0 0 64 64">
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
        <circle cx="32" cy="37" r="11" fill="none" stroke="#3FCF8E" strokeWidth="2" opacity="0.5" />
      </svg>
    </div>,
    size,
  );
}
