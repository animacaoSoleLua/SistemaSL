"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import SidebarNav from "./SidebarNav";

const HIDE_SIDEBAR_ROUTES = new Set(["/login", "/cadastro"]);

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = pathname ? HIDE_SIDEBAR_ROUTES.has(pathname) : false;

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="app-frame">
      <SidebarNav />
      <div className="app-content">{children}</div>
    </div>
  );
}
