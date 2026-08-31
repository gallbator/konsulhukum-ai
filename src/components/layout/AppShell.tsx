"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NewChatButton } from "@/components/sidebar/NewChatButton";
import { ConversationList } from "@/components/sidebar/ConversationList";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ScaleIcon, MenuIcon, CloseIcon, FileTextIcon } from "@/components/ui/icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Closing on navigation only matters on mobile (the sidebar is always
  // visible on md+ regardless of this state), so this is harmless there.
  // Adjusting state during render (React's documented pattern for "reset on
  // prop change") instead of an effect avoids an extra render round-trip.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsSidebarOpen(false);
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col gap-3 border-r border-border bg-surface p-3 transition-transform duration-200 ease-in-out md:static md:z-auto md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-1 py-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ScaleIcon className="h-5 w-5 text-accent" />
            Riset Hukum AI
          </div>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-hover md:hidden"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <NewChatButton />
        <ConversationList />
        <div className="flex flex-col gap-0.5 border-t border-border pt-2">
          <Link
            href="/documents"
            className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
              pathname === "/documents"
                ? "bg-surface-hover text-foreground"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <FileTextIcon className="h-4 w-4" />
            Dokumen
          </Link>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border p-2 md:hidden">
          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-hover"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ScaleIcon className="h-4 w-4 text-accent" />
            Riset Hukum AI
          </div>
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
