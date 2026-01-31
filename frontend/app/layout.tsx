import "./globals.css";
import type { ReactNode } from "react";
import AppShell from "./components/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
