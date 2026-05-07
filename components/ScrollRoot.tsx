"use client";

import { ReactNode, useCallback } from "react";

declare global {
  interface Window {
    __scrollRoot?: HTMLDivElement | null;
  }
}

export default function ScrollRoot({ children }: { children: ReactNode }) {
  const setRef = useCallback((el: HTMLDivElement | null) => {
    if (typeof window !== "undefined") {
      window.__scrollRoot = el;
    }
  }, []);

  return (
    <div className="scroll-root" id="scrollRoot" ref={setRef}>
      {children}
    </div>
  );
}
