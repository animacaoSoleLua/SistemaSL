import "./globals.css";
import type { ReactNode } from "react";
import SidebarNav from "./components/SidebarNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app-frame">
          <SidebarNav />
          <div className="app-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
