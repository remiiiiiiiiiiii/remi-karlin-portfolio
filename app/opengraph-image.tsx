import { ImageResponse } from "next/og";

export const alt = "Remi Karlin, filmmaker and cinematographer, Hong Kong and Paris";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "#000000",
          color: "#ffffff",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 0.9,
          }}
        >
          Remi Karlin
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 26,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#888888",
          }}
        >
          Filmmaker · Cinematographer · Artistic Director · Hong Kong / Paris
        </div>
      </div>
    ),
    size
  );
}
