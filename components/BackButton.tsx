"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      aria-label="Go back"
      style={{
        position: "fixed",
        top: 68,
        left: "var(--pad-x)" as string,
        zIndex: 101,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        cursor: "none",
        color: "rgba(255,255,255,0.7)",
        fontFamily: "var(--font)",
        fontSize: 16,
        lineHeight: 1,
        transition: "border-color 240ms var(--ease), color 240ms var(--ease), background 240ms var(--ease)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.color = "#fff";
        el.style.borderColor = "rgba(255,255,255,0.6)";
        el.style.background = "rgba(0,0,0,0.5)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.color = "rgba(255,255,255,0.7)";
        el.style.borderColor = "rgba(255,255,255,0.25)";
        el.style.background = "rgba(0,0,0,0.3)";
      }}
    >
      ←
    </button>
  );
}
