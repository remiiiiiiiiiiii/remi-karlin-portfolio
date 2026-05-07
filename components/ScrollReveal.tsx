"use client";

import { ReactNode, useEffect, useRef } from "react";

export default function ScrollReveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scrollRoot = document.getElementById("scrollRoot") as HTMLDivElement | null;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            window.setTimeout(() => entry.target.classList.add("in"), delay);
            io.unobserve(entry.target);
          }
        });
      },
      { root: scrollRoot, threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AnyTag = Tag as any;
  return (
    <AnyTag ref={ref} className={`reveal ${className}`}>
      {children}
    </AnyTag>
  );
}
