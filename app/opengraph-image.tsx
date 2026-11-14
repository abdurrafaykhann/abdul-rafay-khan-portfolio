import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background:
          "radial-gradient(circle at 80% 15%, #3a0a52 0%, #0C0C0C 60%)",
        color: "#D7E2EA",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 150,
          fontWeight: 900,
          lineHeight: 1,
          textTransform: "uppercase",
          letterSpacing: -4,
          color: "#BBCCD7",
        }}
      >
        Hi, i’m {site.shortName}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 36,
          fontSize: 40,
          letterSpacing: 6,
          textTransform: "uppercase",
        }}
      >
        AI Engineer · Full-Stack Developer
      </div>
    </div>,
    size,
  );
}
