"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

const THEME_STORAGE_KEY = "financeiro-theme";

export function ThemeToggle() {
  const listenersRef = React.useRef<Set<() => void>>(new Set());
  const subscribe = React.useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);
  const getSnapshot = React.useCallback(
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    [],
  );
  const getServerSnapshot = React.useCallback(() => "light" as const, []);
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    listenersRef.current.forEach((listener) => listener());
  }

  function handleStorage() {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    document.documentElement.classList.toggle("dark", stored === "dark");
  }

  React.useEffect(() => {
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      title="Alternar tema"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
