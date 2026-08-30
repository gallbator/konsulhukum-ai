"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

export function ThemeToggle() {
  // Starts false to match the server-rendered (theme-unaware) markup exactly;
  // synced to the real theme right after mount to avoid a hydration mismatch.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with DOM state set by the beforeInteractive theme script, which SSR cannot know.
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      {isDark ? "Mode terang" : "Mode gelap"}
    </button>
  );
}
